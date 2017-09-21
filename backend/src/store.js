// Copyright Parity Technologies (UK) Ltd., 2017.
// Released under the Apache 2/MIT licenses.

'use strict';

const redis = require('./redis');

const ONFIDO_CHECKS = 'onfido-checks';
const ONFIDO_CHECKS_CHANNEL = 'onfido-checks-channel';
const USED_DOCUMENTS = 'used-documents';

class Store {
  /**
   * Get the data for the given address.
   *
   * @param  {String} address `0x` prefixed address
   *
   * @return {Promise<Object|null>}
   */
  static async get (address) {
    const data = await redis.hget(ONFIDO_CHECKS, address.toLowerCase());

    if (!data) {
      return null;
    }

    try {
      return JSON.parse(data);
    } catch (error) {
      console.error(`could not parse JSON data: ${data}`);
      return null;
    }
  }

  /**
   * Get all the results, keys are addresses, values
   * are { status: String, applicantId: String, checkId: String }
   *
   * @return {Promise<Object|null>}
   */
  static async getAll () {
    const data = await redis.hgetall(ONFIDO_CHECKS);

    if (!data) {
      return null;
    }

    const addresses = Object.keys(data);

    // Parse JSON for each entry, fiter out
    // non-JSON entries
    const stored = addresses
      .map((address) => {
        try {
          return JSON.parse(data[address]);
        } catch (error) {
          return null;
        }
      })
      .reduce((stored, datum, index) => {
        if (datum) {
          stored[addresses[index]] = datum;
        }

        return stored;
      }, {});

    return stored;
  }

  /**
   * Set the given data for the given address.
   *
   * @param  {String} address `0x` prefixed address
   * @param  {Object} data    Javascript Object to set
   *
   * @return {Promise}
   */
  static async set (address, data) {
    return await redis.hset(ONFIDO_CHECKS, address.toLowerCase(), JSON.stringify(data));
  }

  /**
   * Increment check count for an address, return the current count
   *
   * @param {String} address `0x` prefixed address
   *
   * @return {Number} number of times this method has been called for this address
   */
  static async checkCount (address) {
    const countCheck = await redis.incr(`${address}:countCheck`);

    return Number(countCheck);
  }

  /**
   * Check if a document has been used before
   *
   * @param {String} hash keccak256 hash of the document_numbers JSON string
   *
   * @return {Boolean}
   */
  static async hasDocumentBeenUsed (hash) {
    return await redis.sismember(USED_DOCUMENTS, hash);
  }

  /**
   * Mark document as used before
   *
   * @param {String} hash keccak256 hash of the document_numbers JSON string
   */
  static async markDocumentAsUsed (hash) {
    await redis.sadd(USED_DOCUMENTS, hash);
  }

  /**
   * Iterate over all the Onfido href in the check-queue.
   *
   * @param  {Function} callback takes 1 argument:
   *                             - href (`String`)
   *                             will `await` for any returned `Promise`.
   *
   * @return {Promise} resolves after all hrefs have been processed
   */
  static async scan (callback) {
    let next = 0;

    do {
      // Get a batch of responses
      const [cursor, hrefs] = await redis.sscan(ONFIDO_CHECKS_CHANNEL, next);

      next = Number(cursor);

      await Promise.all(
        hrefs.map((href) => callback(href))
      );

    // `next` will be `0` at the end of iteration, explained here:
    // https://redis.io/commands/scan
    } while (next !== 0);
  }

  /**
   * Subscribe to the Onfido check completions
   *
   * @param  {Function} cb   Callback function called on new
   *                         check completion
   */
  static async subscribe (cb) {
    const client = redis.client.duplicate();

    client.on('message', (channel, message) => {
      if (channel !== ONFIDO_CHECKS_CHANNEL) {
        return;
      }

      cb();
    });

    client.on('error', (err) => redis.errorHandler(err));
    client.subscribe(ONFIDO_CHECKS_CHANNEL);

    // Call the callback to check all set in case certifier was down
    await cb();
  }

  /**
   * Push a href to onfido check API to redis and trigger a publish event,
   * so that the certifier server can process the check and trigger the
   * transaction to the certifier contract.
   *
   * @param {String} href in format: https://api.onfido.com/v2/applicants/<applicant-id>/checks/<check-id>
   */
  static async push (href) {
    await redis.sadd(ONFIDO_CHECKS_CHANNEL, href);
    await redis.publish(ONFIDO_CHECKS_CHANNEL, 'new');
  }

  /**
   * Removes  a href from the Redis Onfido Check Set.
   *
   * @param {String} href
   */
  static async remove (href) {
    await redis.srem(ONFIDO_CHECKS_CHANNEL, href);
  }
}

module.exports = Store;
