// Copyright Parity Technologies (UK) Ltd., 2017.
// Released under the Apache 2/MIT licenses.

'use strict';

const config = require('config');

const account = require('./account');
const { CertificationHandler } = require('../abis');
const Contract = require('../api/contract');
const logger = require('../logger');
const { int2hex } = require('../utils');
const store = require('../store');

const gasPrice = config.get('gasPrice');
const certifierHandlerAddress = config.get('certifierHandler.address');
const certifierHandlerMinedBlock = config.get('certifierHandler.minedBlock');

class CertifierHandler extends Contract {
  /**
   * Abstraction over the CertifierHandler contract
   *
   * @param {Object} connector  A ParityConnector
   * @param {Object} certifier  An instance of the certifier
   */
  constructor (connector, certifier) {
    super(connector, certifierHandlerAddress, CertificationHandler);

    this._certifier = certifier;
    this.update().catch((error) => {
      logger.error(error);
    });
  }

  get certifier () {
    return this._certifier;
  }

  async watch () {
    try {
      await this.update();
    } catch (error) {
      logger.error(error);
      process.exit(1);
    }

    // Check that the process has the right account setup
    if (this.values.owner.toLowerCase() !== account.address.toLowerCase()) {
      logger.error(`The local account is not the owner of the CertificationHandler contract.`, {
        owner: this.values.owner,
        account: account.address
      });

      process.exit(1);
    }

    this.connector.on('block', () => this.scanPendings());
    this.listen();

    // Reset the filters every 15 minutes, and go through
    // the logs
    setInterval(() => this.listen(), 1000 * 60 * 15);
  }

  async listen () {
    try {
      // Unsubscribe if already subscribed
      if (this.subId) {
        await this.unsubscribe(this.subId);
      }

      this.subId = await this.subscribe([ 'Requested' ], async (logs) => this.handleRequests(logs));
      const logs = await this.events.Requested().get({ fromBlock: certifierHandlerMinedBlock });

      await this.handleRequests(logs);
    } catch (error) {
      logger.error(error);
    }
  }

  async handleRequests (logs) {
    for (const log of logs) {
      try {
        const { _sender: sender } = log.params;
        const [ who ] = await this.methods.pending(sender).get();

        // The request must have been deleted...
        if (/^(0x)?0+$/.test(who)) {
          continue;
        }

        const isSenderCertified = await this.certifier.isCertified(sender);
        const isWhoCertified = await this.certifier.isCertified(who);
        const [ certifierOfSender ] = await this.certifier.methods.getCertifier(sender).get();

        if (certifierOfSender.toLowerCase() !== account.address.toLowerCase()) {
          logger.warn(`The certifier of ${sender} is not the expected account. Skipping.`);
          continue;
        }

        if (!isSenderCertified) {
          logger.warn(`The sender ${sender} is not certified. Skipping.`);
          continue;
        }

        if (isWhoCertified) {
          logger.warn(`The receiver ${who} is already certified. Skipping.`);
          continue;
        }

        logger.info(`Changing certification from ${sender} to ${who}`);

        try {
          const txRevoke = await this.certifier.revoke(sender);
          const txCertify = await this.certifier.certify(who);
          const txSettle = await this.settle(sender);

          const txs = {
            revoke: txRevoke,
            certify: txCertify,
            settle: txSettle
          };

          // Store the transaction hashes in Redis
          store.setPendingRecertification(sender, { transactions: txs, status: 'pending' });
        } catch (error) {
          logger.error(error);
          store.setPendingRecertification(sender, { status: 'error', error: error.message });
        }
      } catch (error) {
        logger.error(error);
      }
    }
  }

  async scanPendings () {
    store.scanPendingRecertifications(async (error, result) => {
      if (error) {
        return logger.error(error);
      }

      const { address, data } = result;

      if (!data) {
        return store.removePendingRecertification(address);
      }

      const { transactions, status, updatedAt = 0 } = data;
      const now = Date.now();

      if (status === 'pending' && transactions) {
        const { revoke, certify, settle } = transactions;

        const receipts = await Promise.all([
          this.connector.getTxReceipt(revoke),
          this.connector.getTxReceipt(certify),
          this.connector.getTxReceipt(settle)
        ]);

        // At least one transaction have not been mined yet
        if (receipts.findIndex((r) => !r || !r.blockHash) >= 0) {
          return;
        }

        // All of those transactions should emit a log if successful
        const errorIndex = receipts.findIndex((r) => r.logs.length < 1);

        if (errorIndex >= 0) {
          const txError = 'This method has not emitted any log, so must have failed: ' + ['revoke', 'certify', 'settle'][errorIndex];

          return store.setPendingRecertification(address, { status: 'error', transactions, error: txError });
        }

        // No errors
        return store.setPendingRecertification(address, { status: 'success', transactions });
      }

      // Keep the records for an hour
      if (now - updatedAt > 1000 * 3600) {
        return store.removePendingRecertification(address);
      }

      if (status === 'error' || status === 'success') {
        return;
      }

      logger.info(`Unkown recertification data for ${address}`, data);
      return store.removePendingRecertification(address);
    });
  }

  /**
   * Settle a certification modification request
   *
   * @param {String} address of the sender
   *
   * @return {Promise<String>} promise of a TX hash
   */
  async settle (sender) {
    // We specify the gas since the gas estimation will throw because the
    // `revoke` and `certify` methods haven't gone through yet
    const gasLimit = int2hex(100000);
    const txHash = await this.methods.settle(sender).post({ gasLimit, gasPrice }, account.privateKey);

    console.log(`sent settle tx for ${sender} : ${txHash} `);

    return txHash;
  }
}

module.exports = CertifierHandler;
