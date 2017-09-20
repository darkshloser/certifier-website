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

class RedisSet {
  /**
   * Constructor, taking as argument the Redis HKEY
   * and the value key where the ids will be stored,
   * and from which the single value data keys will
   * be derived
   *
   * @param  {String} hkey - The Redis hash key
   * @param  {[type]} vkey - The Redis value key
   */
  constructor (hkey, vkey) {
    this._hkey = hkey;
    this._vkey = vkey;
  }

  get hkey () {
    return this._hkey;
  }

  get vkey () {
    return this._vkey;
  }

  /**
   * Return all resources stored in Redis
   * for this specific set.
   * The Promise resolves with an Object, which
   * keys are the ids, and value the actual data
   *
   * @return {Promise<Object>}
   */
  async getAll () {
    const ids = await this.getIds();
    const all = {};

    for (let id of ids) {
      const data = await this.get(id);

      all[id] = data;
    }

    return all;
  }

  /**
   * Get a single resource from its ID,
   * as an Object, or null if it's innexistant.
   *
   * @param  {String} id             - The resource's ID
   * @return {Promise<Object|null>}
   */
  async get (id) {
    const data = await redis.hget(this.hkey, `${this.vkey}:${id}`);

    return data || null;
  }

  /**
   * Get all the resources IDs as an Array.
   *
   * @return {Promise<Array>}
   */
  async getIds () {
    const json = await redis.hget(this.hkey, this.vkey);

    if (!json) {
      return [];
    }

    try {
      return JSON.parse(json);
    } catch (error) {
      throw new Error(`could not parse ids for ${this.hkey}::${this.vkey} : "${json}"`);
    }
  }

  /**
   * Store the given resource in Redis. An id
   * must be provided in the `data` Object.
   *
   * @param  {Object} data - The resource to store
   * @return {Promise}
   */
  async store (data) {
    const { id } = data;

    if (!id) {
      throw new Error(`no id has been found in the given data to store : ${JSON.stringify(data)}`);
    }

    const ids = await this.getIds();

    if (!ids.includes(id)) {
      ids.push(id);
      await redis.hset(this.hkey, this.vkey, JSON.stringify(ids));
    }

    await redis.hset(this.hkey, `${this.vkey}:${id}`, JSON.stringify(data));
  }
}

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

  async getApplicants () {
    const applicantIds = await this.getApplicantIds();
    const applicants = {};

    for (let applicantId of applicantIds) {
      const json = await redis.hget(this.hkey, `${REDIS_APPLICANTS_KEY}:${applicantId}`);
      let applicant;

      try {
        applicant = JSON.parse(json);
      } catch (error) {
        throw new Error(`could not parse applicant ${applicantId} for ${this.address} : "${json}"`);
      }

      applicants[applicantId] = applicant;
    }

    return applicants;
  }

  async getApplicantIds () {
    const json = await redis.hget(this.hkey, REDIS_APPLICANTS_KEY);
    let applicantIds;

    try {
      applicantIds = JSON.parse(json);
    } catch (error) {
      throw new Error(`could not parse applicant ids for ${this.address} : "${json}"`);
    }

    return applicantIds.sort((elA, elB) => elA.updated - elB.updated);
  }

  async getCheckIds () {
    const json = await redis.hget(this.hkey, REDIS_CHECKS_KEY);
    let checkIds;

    try {
      checkIds = JSON.parse(json);
    } catch (error) {
      throw new Error(`could not parse check ids for ${this.address} : "${json}"`);
    }

    return checkIds.sort((elA, elB) => elA.updated - elB.updated);
  }

  async getStatus () {
    const status = await redis.hget(this.hkey, REDIS_STATUS_KEY);

    if (!STATUS[status]) {
      throw new Error(`unkown status for ${this.address} : "${status}"`);
    }

    return status;
  }

  async storeApplicant (applicant) {
    const { id } = applicant;
    const applicantIds = await this.getApplicantIds();

    if (!applicantIds.includes(id)) {
      applicantIds.push(id);
      await redis.hset(this.hkey, REDIS_APPLICANTS_KEY, JSON.stringify(applicantIds));
    }

    await redis.hset(this.hkey, `${REDIS_APPLICANTS_KEY}:${id}`, JSON.stringify(applicant));
  }

  async storeCheck (check) {
    const { id } = check;
    const checkIds = await this.getCheckIds();

    if (!checkIds.includes(id)) {
      checkIds.push(id);
      await redis.hset(this.hkey, REDIS_CHECKS_KEY, JSON.stringify(checkIds));
    }

    await redis.hset(this.hkey, `${REDIS_CHECKS_KEY}:${id}`, JSON.stringify(check));
  }
}

module.exports = Identity;
