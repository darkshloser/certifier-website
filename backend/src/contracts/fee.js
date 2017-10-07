// Copyright Parity Technologies (UK) Ltd., 2017.
// Released under the Apache 2/MIT licenses.

'use strict';

const config = require('config');
const EthereumTx = require('ethereumjs-tx');

const account = require('./account');
const { FeeRegistrar, OldFeeRegistrar } = require('../abis');
const Contract = require('../api/contract');
const { int2hex } = require('../utils');

const gasPrice = config.get('gasPrice');

class Fee extends Contract {
  /**
   * Abstraction over the fee registrar contract
   *
   * @param {Object} connector    A ParityConnector
   * @param {String} address      `0x` prefixed
   * @param {String} oldAddress   `0x` prefixed address of the old contract
   */
  constructor (connector, address, oldAddress) {
    super(connector, address, FeeRegistrar);

    this._oldContract = new Contract(connector, oldAddress, OldFeeRegistrar);
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

    // Otherwise fallback to the old contract
    const [ oldHasPaid ] = await this._oldContract.methods.paid(address).get();

    return oldHasPaid;
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
   * @param {Object} options Options Object, fallback can be
   *                         set to `false` if we don't want to
   *                         fallback to the old fee contract (@see refund)
   *
   * @return {Promise<Object>} contains `paymentCount` and `paymentOrigins`
   */
  async paymentStatus (address, options = { fallback: true }) {
    const [ paymentCount, paymentOrigins ] = await this.methods.payer(address).get();

    // Return the new-contract value if any
    // or if no fallback option set
    if (paymentCount.gt(0) || !options.fallback) {
      return {
        paymentCount,
        paymentOrigins
      };
    }

    // Otherwise fallback to the old contract
    const [ oldPaymentCount, oldPaymentOrigins ] = await this._oldContract.methods.payer(address).get();

    return {
      paymentCount: oldPaymentCount,
      paymentOrigins: oldPaymentOrigins
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
