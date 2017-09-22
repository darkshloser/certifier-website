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

const REDIS_PREFIX = 'picops::identities';

const REDIS_APPLICANTS_KEY = 'applicants';
const REDIS_CHECKS_KEY = 'checks';

const REDIS_ERROR_KEY = 'error';
const REDIS_REASON_KEY = 'reason';
const REDIS_RESULT_KEY = 'result';
const REDIS_STATUS_KEY = 'status';

class RedisSet {
  /**
   * Constructor, taking as argument the
   * prefix that will be used in Redis
   *
   * @param  {String} prefix   - The Redis prefix
   * @param  {[String]} fields - An Array of fields
   */
  constructor (prefix, fields, identity) {
    this._fields = fields;
    this._prefix = prefix;
    this._identity = identity;
  }

  get fields () {
    return this._fields;
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
    return redis.scard(this.prefix);
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
    const ids = await this.getIds();
    const all = [];

    for (let id of ids) {
      all.push(await this.get(id));
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
    // Return null if id not in the set
    if (!await this.has(id)) {
      return null;
    }

    const object = { id };

    for (let field of this.fields) {
      const value = await redis.hget(`${this.prefix}::${id}`, field);

      object[field] = value || null;
    }

    return object;
  }

  /**
   * Get all the resources IDs as an Array.
   *
   * @return {Promise<Array>}
   */
  async getIds () {
    return redis.smembers(this.prefix);
  }

  /**
   * Whether the id exists in the set
   *
   * @param  {String} id             - The resource's ID
   * @return {Promise<Boolean>}
   */
  async has (id) {
    return redis.sismember(this.prefix, id);
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

    if (!await this.identity.exists()) {
      await this.identity.create();
    }

    // If a new element, add it to the set of ids
    if (!await this.has(id)) {
      await redis.sadd(this.prefix, id);
    }

    for (let field of this.fields) {
      const value = data[field];

      // Set the field's value if any, or delete from HSET
      if (value) {
        await redis.hset(`${this.prefix}::${id}`, field, value);
      } else {
        await redis.hdel(`${this.prefix}::${id}`, field);
      }
    }
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

    this._applicants = new RedisSet(
      `${prefix}::${REDIS_APPLICANTS_KEY}`,
      ['checkId'],
      this
    );

    this._checks = new RedisSet(
      `${prefix}::${REDIS_CHECKS_KEY}`,
      [
        'applicantId', 'creationDate',
        'status', 'result', 'reason', 'error'
      ],
      this
    );
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
      return {};
    }

    const checks = await this.checks.getAll();
    const check = checks.sort((checkA, checkB) => new Date(checkB.creationDate) - new Date(checkA.creationDate))[0];

    // No check, but exists. An application should have
    // been created, but no checks for now
    if (!check) {
      return { status: STATUS.CREATED };
    }

    const { error, reason, result, status } = check;

    return { error, reason, result, status };
  }
}

Identity.REDIS_PREFIX = REDIS_PREFIX;

module.exports = Identity;
