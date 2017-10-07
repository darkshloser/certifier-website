// Copyright Parity Technologies (UK) Ltd., 2017.
// Released under the Apache 2/MIT licenses.

'use strict';

const { FeeRegistrar, OldFeeRegistrar } = require('../abis');
const Contract = require('../api/contract');

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
   *
   * @return {Promise<Object>} contains `paymentCount` and `paymentOrigins`
   */
  async paymentStatus (address) {
    const [ paymentCount, paymentOrigins ] = await this.methods.payer(address).get();

    // Return the new-contract value if any
    if (paymentCount.gt(0)) {
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
}

module.exports = Fee;
