// Copyright Parity Technologies (UK) Ltd., 2017.
// Released under the Apache 2/MIT licenses.

'use strict';

const BigNumber = require('bignumber.js');
const config = require('config');
const EthereumTx = require('ethereumjs-tx');

const account = require('./account');
const { FeeRegistrar, OldFeeRegistrar } = require('../abis');
const Contract = require('../api/contract');
const { int2hex } = require('../utils');

const gasPrice = config.get('gasPrice');

const contractAddress = config.get('feeContract');
const fallbackContracts = config.get('fallbackFeeContracts');

class Fee extends Contract {
  /**
   * Abstraction over the fee registrar contract
   *
   * @param {Object} connector    A ParityConnector
   */
  constructor (connector) {
    super(connector, contractAddress, FeeRegistrar);

    this._fallbacks = fallbackContracts.map((c) => {
      const abi = c.version === 1
        ? FeeRegistrar
        : OldFeeRegistrar;

      const contract = new Contract(connector, c.address, abi);

      contract.version = c.version;
      return contract;
    });
  }

  /**
   * Check if account has paid
   *
   * @param {String}  address `0x` prefixed
   *
   * @return {Promise<Boolean>}
   */
  async hasPaid (address) {
    const [ hasPaid ] = await this.methods.paid(address).get();

    // Return the new-contract value if any
    if (hasPaid) {
      return true;
    }

    // Otherwise fallback
    for (const fallback of this._fallbacks) {
      const [ fallbackHasPaid ] = await fallback.methods.paid(address).get();

      if (fallbackHasPaid) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get the required fee in wei
   *
   * @return {Promise<BigNumber>}
   */
  async fee () {
    const [ fee ] = await this.methods.fee().get();

    return fee;
  }

  /**
   * Get the payment origins (addresses) and count
   *
   * @param {String} address `0x` prefixed
   * @param {Object} options Options Object, the abi version can
   *                         be specified (@see refund)
   *
   * @return {Promise<Object>} contains `paymentCount` and `paymentOrigins`
   */
  async paymentStatus (address, options = { version: null }) {
    const [ paymentCount, paymentOrigins ] = await this.methods.payer(address).get();

    // Return the new-contract value if any
    // or if no fallback option set
    if (paymentCount.gt(0)) {
      return {
        paymentCount,
        paymentOrigins
      };
    }

    // Otherwise fallback
    for (const fallback of this._fallbacks) {
      if (options.version !== null && fallback.version !== options.version) {
        return;
      }

      const [ fallbackPaymentCount, fallbackPaymentOrigins ] = await fallback.methods.payer(address).get();

      if (fallbackPaymentCount.gt(0)) {
        return {
          paymentCount: fallbackPaymentCount,
          paymentOrigins: fallbackPaymentOrigins
        };
      }
    }

    return {
      paymentCount: new BigNumber(0),
      paymentOrigins: []
    };
  }

  /**
   * Refund a payment using a trusted account
   *
   * @param {String} who - address to refund, `0x` prefixed
   * @param {String} origin of the payment, `0x` prefixed
   *
   * @return {Promise<String>} promise of a TX hash
   */
  async refund ({ who, origin }) {
    const { connector } = this;
    const fee = await this.fee();

    const data = this.methods.revoke(who, origin).data;
    const options = {
      from: account.address,
      to: this.address,
      value: int2hex(fee),
      gasPrice,
      data
    };

    const gasLimit = await connector.estimateGas(options);
    const nonce = await connector.nextNonce(options.from);

    options.gasLimit = gasLimit;
    options.nonce = nonce;

    const tx = new EthereumTx(options);

    tx.sign(account.privateKey);

    const serializedTx = `0x${tx.serialize().toString('hex')}`;

    const txHash = await connector.sendTx(serializedTx);

    console.log(`sent refund tx for ${who} : ${txHash} `);

    return txHash;
  }
}

module.exports = Fee;
