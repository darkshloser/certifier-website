// Copyright Parity Technologies (UK) Ltd., 2017.
// Released under the Apache 2/MIT licenses.

'use strict';

const config = require('config');

const { RpcTransport } = require('./api/transport');
const Certifier = require('./contracts/certifier');
const CertifierHandler = require('./contracts/certifierHandler');
const Identity = require('./identity');
const Onfido = require('./onfido');
const store = require('./store');
const ParityConnector = require('./api/parity');

class AccountCertifier {
  static run (wsUrl, contractAddress) {
    return new AccountCertifier(wsUrl, contractAddress);
  }

  constructor (wsUrl, contractAddress) {
    const transport = new RpcTransport(wsUrl);

    this._updateLock = false;
    this._verifyLock = false;
    this._connector = new ParityConnector(transport);
    this._certifier = new Certifier(this._connector, contractAddress);

    const certifierHandler = new CertifierHandler(this._connector, this._certifier);

    certifierHandler.watch();
    this.init();
  }

  async init () {
    try {
      await store.subscribe(store.ONFIDO_CHECKS_CHANNEL, async () => this.verifyOnfidos());
      this._connector.on('block', async () => this.checkPendingTransactions(), this);
      console.warn('\n> Started account certifier!\n');
    } catch (error) {
      console.error(error);
    }
  }

  async checkPendingTransactions () {
    if (this._checkPendingTxsLock) {
      return;
    }

    this._checkPendingTxsLock = true;

    try {
      await store.scanPendingTransactions(async (error, { address, txHash, verification }) => {
        if (error) {
          return console.error(error);
        }

        const receipt = await this._connector.getTxReceipt(txHash);

        if (!receipt || !receipt.blockHash) {
          return;
        }

        const identity = new Identity(address);

        console.warn(`got a receipt for ${address} ; storing the value in Redis`);

        // Store the verification result
        await identity.storeVerification(verification);
        // Remove the pending transaction from Redis
        await store.removePendingTransaction(address);
      });
    } catch (error) {
      console.error(error);
    }

    this._checkPendingTxsLock = false;
  }

  async verifyOnfidos () {
    if (this._verifyLock) {
      return;
    }

    this._verifyLock = true;

    await store.scan(store.ONFIDO_CHECKS_CHANNEL, async (href) => this.verifyOnfido(href));

    this._verifyLock = false;
  }

  async verifyOnfido (href) {
    console.warn(`> verifying ${href}...`);

    let verification;

    try {
      verification = await Onfido.verify(href);
    } catch (error) {
      console.error(error);
      return store.remove(href);
    }

    try {
      await this.storeVerification(verification);
      await store.remove(href);
      console.warn('> verified!\n');
    } catch (error) {
      console.error(error);
    }
  }

  // Only error here is Redis error or Onfido error
  // which shouldn't be saved linked to the address
  async storeVerification (verification) {
    const {
      address,
      valid,
      applicantId
    } = verification;

    if (await store.hasPendingTransaction(address)) {
      console.warn(`already has a pending transaction for ${address}`);
      return;
    }

    const identity = new Identity(address);
    let shouldCertify = false;

    await store.addApplicant(applicantId);

    const certified = await this._certifier.isCertified(address);

    shouldCertify = valid && !certified;

    // If no need to certify, then store the transaction
    if (!shouldCertify) {
      await identity.storeVerification(verification);
      return;
    }

    process.stderr.write(`> certifying ${address} ... `);
    const txHash = await this._certifier.certify(address);

    process.stderr.write(` sent tx with : ${txHash} ; adding verification to pending store \n`);
    store.addPendingTransaction(txHash, verification);
  }
}

AccountCertifier.run(config.get('nodeWs'), config.get('certifierContract'));
