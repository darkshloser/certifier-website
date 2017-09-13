// Copyright Parity Technologies (UK) Ltd., 2017.
// Released under the Apache 2/MIT licenses.

'use strict';

const redis = require('./redis');

const ONFIDO_CHECKS = 'onfido-checks';
const ONFIDO_CHECKS_CHANNEL = 'onfido-checks-channel';

class Onfido {
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
   * Set the given data for the given address.
   *
   * @param  {String} address `0x` prefixed address
   * @param  {Object} data    Javascript Object to set
   *
   * @return {Promise}
   */
  static async set (address, data) {
    return redis.hset(ONFIDO_CHECKS, address.toLowerCase(), JSON.stringify(data));
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

      for (const href of hrefs) {
        await callback(href);
      }

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

    // Call the callback to check all set first
    await cb();

    client.on('message', (channel, message) => {
      if (channel !== ONFIDO_CHECKS_CHANNEL) {
        return;
      }

      cb();
    });

    client.subscribe(ONFIDO_CHECKS_CHANNEL);
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

module.exports = {
  Onfido
};