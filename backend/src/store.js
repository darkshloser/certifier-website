// Copyright Parity Technologies (UK) Ltd., 2017.
// Released under the Apache 2/MIT licenses.

'use strict';

const redis = require('./redis');
const Identity = require('./identity');

const ONFIDO_CHECKS_CHANNEL = 'onfido-checks-channel';
const USED_DOCUMENTS = 'used-documents';

class Store {
  /**
   * Add an applicant id to a Redis set
   *
   * @param {String} applicantId
   */
  static async addApplicant (applicantId) {
    return redis.sadd('picops::applicants', applicantId);
  }

  /**
   * Count the number of stored applicants
   *
   * @return {Promise<Number>}
   */
  static async countApplicants () {
    return redis.scard('picops::applicants');
  }

  /**
   * Return whether the given applicant id
   * is already known
   *
   * @param {String} applicantId
   *
   * @return {Promise<Boolean>}
   */
  static async hasApplicant (applicantId) {
    return redis.sismember('picops::applicants', applicantId);
  }

  /**
   * Iterate over all identities
   *
   * @param  {Function} callback takes 1 argument:
   *                             - address (`String`)
   *                             will `await` for any returned `Promise`.
   *
   * @return {Promise} resolves after all identities have been processed
   */
  static async scanIdentities (callback) {
    let next = 0;

    do {
      // Get a batch of responses
      const [cursor, addresses] = await redis.sscan(Identity.REDIS_PREFIX, next);

      next = Number(cursor);

      for (let address of addresses) {
        await callback(new Identity(address));
      }

    // `next` will be `0` at the end of iteration, explained here:
    // https://redis.io/commands/scan
    } while (next !== 0);
  }

  /**
   * Check if a document has been used before
   *
   * @param {String} hash keccak256 hash of the document_numbers JSON string
   *
   * @return {Boolean}
   */
  static async hasDocumentBeenUsed (hash) {
    return redis.sismember(USED_DOCUMENTS, hash);
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

      for (let href of hrefs) {
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
