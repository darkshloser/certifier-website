// Copyright Parity Technologies (UK) Ltd., 2017.
// Released under the Apache 2/MIT licenses.

'use strict';

const { FeeRegistrar } = require('../abis');
const Contract = require('../api/contract');

class Fee extends Contract {
  /**
   * Abstraction over the fee registrar contract
   *
   * @param {Object} connector  A ParityConnector
   * @param {String} address    `0x` prefixed
   */
  constructor (connector, address) {
    super(connector, address, FeeRegistrar);
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

    return hasPaid;
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
   *
   * @return {Promise<Object>} contains `paymentCount` and `paymentOrigins`
   */
  async paymentStatus (address) {
    const [ paymentCount, paymentOrigins ] = await this.methods.payer(address).get();

    return {
      paymentCount,
      paymentOrigins
    };
  }
}

module.exports = Fee;
