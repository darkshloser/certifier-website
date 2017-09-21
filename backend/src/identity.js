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

const REDIS_ERROR_KEY = 'error';
const REDIS_REASON_KEY = 'reason';
const REDIS_RESULT_KEY = 'result';
const REDIS_STATUS_KEY = 'status';

class RedisValue {
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
   * Get the resource's value from Redis,
   * or null if innexistant
   *
   * @return {Promise<String|null>}
   */
  async get () {
    const value = await redis.hget(this.hkey, this.vkey);

    return value || null;
  }

  /**
   * Set the given data at as the resources value.
   *
   * @param {String} data
   */
  async set (data) {
    await redis.hset(this.hkey, this.vkey);
  }
}

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
    let nextData = Object.assign({}, data);

    if (!id) {
      throw new Error(`no id has been found in the given data to store : ${JSON.stringify(data)}`);
    }

    const ids = await this.getIds();

    if (!ids.includes(id)) {
      ids.push(id);
      await redis.hset(this.hkey, this.vkey, JSON.stringify(ids));
    } else {
      const prevData = await this.get(id);

      // Don't overwrite, append data
      nextData = Object.assign({}, prevData || {}, nextData);
    }

    await redis.hset(this.hkey, `${this.vkey}:${id}`, JSON.stringify(nextData));
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
    this._hkey = `${Identity.HKEY_PREFIX}${address.toLowerCase()}`;

    this.applicants = new RedisSet(this.hkey, REDIS_APPLICANTS_KEY);
    this.checks = new RedisSet(this.hkey, REDIS_CHECKS_KEY);

    this.error = new RedisValue(this.hkey, REDIS_ERROR_KEY);
    this.reason = new RedisValue(this.hkey, REDIS_REASON_KEY);
    this.result = new RedisValue(this.hkey, REDIS_RESULT_KEY);
    this.status = new RedisValue(this.hkey, REDIS_STATUS_KEY);
  }

  get address () {
    return this._address;
  }

  get hkey () {
    return this._hkey;
  }

  async exists () {
    return await redis.exists(this.hkey);
  }

  async getData () {
    const [ error, reason, result, status ] = await Promise.all([
      this.error.get(),
      this.reason.get(),
      this.result.get(),
      this.status.get()
    ]);

    return { error, reason, result, status };
  }
}

Identity.HKEY_PREFIX = 'picops::identity_';

module.exports = Identity;
