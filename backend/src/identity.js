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

const RESULT = {
  FAIL: 'fail',
  SUCCESS: 'success'
};

const REDIS_PREFIX = 'picops::identities';

class Resource {
  /**
   * Constructor, taking as argument the
   * prefix that will be used in Redis
   *
   * @param  {String} prefix      - The Redis prefix
   * @param  {Identity} identity  - The linked identity
   */
  constructor (prefix, identity) {
    this._prefix = prefix;
    this._identity = identity;
  }

  get identity () {
    return this._identity;
  }

  get prefix () {
    return this._prefix;
  }

  /**
   * Return the number of elements in the resources'
   * set
   *
   * @return {Promise<Number>}
   */
  async count () {
    return redis.hlen(this.prefix);
  }

  /**
   * Delete the resource from DB
   *
   * @param {String} id
   */
  async del (id) {
    return redis.hdel(this.prefix, id);
  }

  /**
   * Return all resources stored in Redis
   * for this specific set.
   * The Promise resolves with an Array containing
   * all the data Objects
   *
   * @return {Promise<Array>}
   */
  async getAll () {
    const results = await redis.hvals(this.prefix);
    const all = results
      .map((json) => {
        try {
          return JSON.parse(json);
        } catch (error) {
          console.error(`could not deserialise '${json}'`);
        }
      })
      .filter((data) => data);

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
    // Return null if id not in the set
    if (!await this.has(id)) {
      return null;
    }

    const json = await redis.hget(this.prefix, id);
    let data = null;

    try {
      data = JSON.parse(json);
    } catch (error) {
      console.error(`could not deserialise '${json}'`);
    }

    return data;
  }

  /**
   * Get all the resources IDs as an Array.
   *
   * @return {Promise<Array>}
   */
  async getIds () {
    return redis.hkeys(this.prefix);
  }

  /**
   * Whether the id exists in the set
   *
   * @param  {String} id             - The resource's ID
   * @return {Promise<Boolean>}
   */
  async has (id) {
    return redis.hexists(this.prefix, id);
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

    // Create identity in case not created yet
    await this.identity.create();

    // Store the actual data
    await redis.hset(this.prefix, id, JSON.stringify(data));
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

    this._address = address.toLowerCase();

    const prefix = `${REDIS_PREFIX}::${this.address}`;

    this._applicants = new Resource(`${prefix}::applicants`, this);
    this._checks = new Resource(`${prefix}::checks`, this);
  }

  get address () {
    return this._address;
  }

  get applicants () {
    return this._applicants;
  }

  get checks () {
    return this._checks;
  }

  async create () {
    return redis.sadd(REDIS_PREFIX, this.address);
  }

  async exists () {
    return redis.sismember(REDIS_PREFIX, this.address);
  }

  async getData () {
    if (!await this.exists()) {
      return { status: STATUS.UNKOWN };
    }

    // @todo Sort checks by creation date as a ZSET
    const checks = await this.checks.getAll();
    const check = checks
      .sort((checkA, checkB) => new Date(checkB.creationDate) - new Date(checkA.creationDate))[0];

    // No check, but exists. An application should have
    // been created, but no checks for now
    if (!check) {
      return { status: STATUS.CREATED };
    }

    return check;
  }

  async storeVerification (verification) {
    const {
      valid,
      reason,
      pending,
      applicantId,
      checkId,
      creationDate,
      documentHash
    } = verification;

    const check = { id: checkId, applicantId, creationDate };

    if (documentHash) {
      check.documentHash = documentHash;
    }

    await this.applicants.store({ id: applicantId, checkId });

    if (pending) {
      return this.checks.store(Object.assign({}, check, { status: STATUS.PENDING }));
    }

    await this.checks.store(Object.assign({}, check, {
      status: STATUS.COMPLETED,
      result: valid ? RESULT.SUCCESS : RESULT.FAIL,
      reason
    }));
  }
}

Identity.REDIS_KEY = REDIS_PREFIX;

Identity.RESULT = RESULT;
Identity.STATUS = STATUS;

module.exports = Identity;
