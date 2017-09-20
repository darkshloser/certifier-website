// Copyright Parity Technologies (UK) Ltd., 2017.
// Released under the Apache 2/MIT licenses.

'use strict';

const redis = require('./redis');
const { isValidAddress } = require('./utils');

const STATUS = {
  UNKOWN: 'unkown',
  CREATED: 'created',
  PENDING: 'pending',
  COMPLETED: 'completed'
};

const REDIS_APPLICANTS_KEY = 'applicants';
const REDIS_CHECKS_KEY = 'checks';
const REDIS_STATUS_KEY = 'status';

class Identity {
  /**
   * Indentity constructor, taking an
   * Ethereum address as argument.
   *
   * @param  {String} address - `0x` prefixed address
   *                             of the identity
   */
  constructor (address) {
    if (!isValidAddress(address)) {
      throw new Error(`${address} is not a valid address`);
    }

    this._address = address;
    this._hkey = `picops::identity_${address.toLowerCase()}`;
  }

  get address () {
    return this._address;
  }

  get hkey () {
    return this._hkey;
  }

  async applicants () {
    const json = await redis.hget(this.hkey, REDIS_APPLICANTS_KEY);
    let applicants;

    try {
      applicants = JSON.parse(json);
    } catch (error) {
      throw new Error(`could not parse applicants for ${this.address} : "${json}"`);
    }

    return applicants.sort((elA, elB) => elA.updated - elB.updated);
  }

  async checks () {
    const json = await redis.hget(this.hkey, REDIS_CHECKS_KEY);
    let checks;

    try {
      checks = JSON.parse(json);
    } catch (error) {
      throw new Error(`could not parse checks for ${this.address} : "${json}"`);
    }

    return checks.sort((elA, elB) => elA.updated - elB.updated);
  }

  async status () {
    const status = await redis.hget(this.hkey, REDIS_STATUS_KEY);

    if (!STATUS[status]) {
      throw new Error(`unkown status for ${this.address} : "${status}"`);
    }

    return status;
  }
}

module.exports = Identity;
