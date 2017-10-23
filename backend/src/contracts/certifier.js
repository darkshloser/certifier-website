// Copyright Parity Technologies (UK) Ltd., 2017.
// Released under the Apache 2/MIT licenses.

'use strict';

const config = require('config');

const account = require('./account');
const { MultiCertifier } = require('../abis');
const Contract = require('../api/contract');

const gasPrice = config.get('gasPrice');

class Certifier extends Contract {
  /**
   * Abstraction over the certifier contract, found here:
   * https://github.com/paritytech/second-price-auction/blob/master/src/contracts/MultiCertifier.sol
   *
   * @param {Object} connector  A ParityConnector
   * @param {String} address    `0x` prefixed
   */
  constructor (connector, address) {
    super(connector, address, MultiCertifier);
  }

  /**
   * Certify an address using a trusted account
   *
   * @param {String} address to certify, `0x` prefixed
   *
   * @return {Promise<String>} promise of a TX hash
   */
  async certify (address) {
    const txHash = await this.methods.certify(address).post({ gasPrice }, account.privateKey);

    console.log(`sent certify tx for ${address} : ${txHash} `);

    return txHash;
  }

  /**
   * Check if account is certified
   *
   * @param {String}  address `0x` prefixed
   *
   * @return {Promise<Boolean>}
   */
  async isCertified (address) {
    const [ certified ] = await this.methods.certified(address).get();

    return certified;
  }

  /**
   * Revoke an address using a trusted account
   *
   * @param {String} address to revoke, `0x` prefixed
   *
   * @return {Promise<String>} promise of a TX hash
   */
  async revoke (address) {
    const txHash = await this.methods.revoke(address).post({ gasPrice }, account.privateKey);

    console.log(`sent revoke tx for ${address} : ${txHash} `);

    return txHash;
  }
}

module.exports = Certifier;
