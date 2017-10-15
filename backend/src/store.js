// Copyright Parity Technologies (UK) Ltd., 2017.
// Released under the Apache 2/MIT licenses.

'use strict';

const redis = require('./redis');
const Identity = require('./identity');

const ONFIDO_CHECKS_CHANNEL = 'picops::onfido-checks-channel';
const FEE_REFUND_CHANNEL = 'picops::refund-channel';

const REDIS_APPLICANTS_KEY = 'picops::applicants';
const REDIS_PENDING_TXS_KEY = 'picops::pending-txs';
const REDIS_FEE_REFUND_KEY = 'picops::refunds';
const REDIS_LOCKS_KEY = 'picops::locker';
const REDIS_USED_DOCUMENTS_KEY = 'picops::used-documents';

class Store {
  /**
   * Add an applicant id to a Redis set
   *
   * @param {String} applicantId
   */
  static async addApplicant (applicantId) {
    return redis.sadd(REDIS_APPLICANTS_KEY, applicantId);
  }

  /**
   * Add a pending certification to the Redis state.
   * It will be checked on new block to see if the
   * transaction has been mined or not.
   *
   * @param {String} txHash       `0x`-prefixed transaction hash
   * @param {Object} verification The Onfido verification to store
   */
  static async addPendingTransaction (txHash, verification) {
    await redis.hset(REDIS_PENDING_TXS_KEY, verification.address, JSON.stringify({ txHash, verification }));
  }

  /**
   * Check if the given address has a pending transaction
   *
   * @param  {String} address `0x` prefixed hex address
   * @return {Boolean}
   */
  static async hasPendingTransaction (address) {
    return redis.hexists(REDIS_PENDING_TXS_KEY, address);
  }

  /**
   * Remove any existing pending transaction for the given
   * address
   *
   * @param  {String} address `0x` prefixed hex address
   */
  static async removePendingTransaction (address) {
    await redis.hdel(REDIS_PENDING_TXS_KEY, address);
  }

  /**
   * Scan through all the pending transactions
   *
   * @param  {Function} callback Callback called whith every pending
   *                             transactions
   */
  static async scanPendingTransactions (callback) {
    let next = 0;

    do {
      // Get a batch of responses
      const [cursor, values] = await redis.hscan(REDIS_PENDING_TXS_KEY, next);

      next = Number(cursor);

      for (let datum of values) {
        if (!datum) {
          return console.warn('no value returned', JSON.stringify({ datum }));
        }

        const [ address, json ] = datum;

        if (!address || !json) {
          return console.warn('no address or json', JSON.stringify({ address, json, datum }));
        }

        try {
          const { txHash, verification } = JSON.parse(json);

          await callback(null, { address, txHash, verification });
        } catch (error) {
          console.error('JSON parsing error', JSON.stringify({ address, json, datum }));
          callback(error);
        }
      }

    // `next` will be `0` at the end of iteration, explained here:
    // https://redis.io/commands/scan
    } while (next !== 0);
  }

  /**
   * Count the number of stored applicants
   *
   * @return {Promise<Number>}
   */
  static async countApplicants () {
    return redis.scard(REDIS_APPLICANTS_KEY);
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
    return redis.sismember(REDIS_APPLICANTS_KEY, applicantId);
  }

  /**
   * Locks the given Eth address (eg. while
   * doing operations on the address, creating a check, etc.)
   * Expire in 5 minutes
   *
   * @param {String} address
   */
  static async lock (address) {
    await redis.psetex(`${REDIS_LOCKS_KEY}::${address}`, 1000 * 60 * 5, 'true');
  }

  /**
   * Whether the given Eth address is locked
   *
   * @param {String} address
   *
   * @return {Promise<Boolean>}
   */
  static async locked (address) {
    return (await redis.get(`${REDIS_LOCKS_KEY}::${address}`)) === 'true';
  }

  /**
   * Unlocks the given Eth address
   *
   * @param {String} address
   */
  static async unlock (address) {
    return redis.del(`${REDIS_LOCKS_KEY}::${address}`);
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
      const [cursor, addresses] = await redis.sscan(Identity.REDIS_KEY, next);

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
    return redis.sismember(REDIS_USED_DOCUMENTS_KEY, hash);
  }

  /**
   * Mark document as used before
   *
   * @param {String} hash keccak256 hash of the document_numbers JSON string
   */
  static async markDocumentAsUsed (hash) {
    await redis.sadd(REDIS_USED_DOCUMENTS_KEY, hash);
  }

  /**
   * Iterate over all the element in the queue-channel.
   *
   * @param  {String} channel The channel to scan
   * @param  {Function} callback takes 1 argument:
   *                             - href (`String`)
   *                             will `await` for any returned `Promise`.
   *
   * @return {Promise} resolves after all hrefs have been processed
   */
  static async scan (channel, callback) {
    let next = 0;

    do {
      // Get a batch of responses
      const [cursor, hrefs] = await redis.sscan(channel, next);

      next = Number(cursor);

      for (let href of hrefs) {
        await callback(href);
      }

    // `next` will be `0` at the end of iteration, explained here:
    // https://redis.io/commands/scan
    } while (next !== 0);
  }

  /**
   * Subscribe to the given channel
   *
   * @param {String} channel The channel to subscribe to
   * @param {Function} cb   Callback function called on new
   *                         check completion
   */
  static async subscribe (channel, cb) {
    const client = redis.client.duplicate();

    client.on('message', (messageChannel, message) => {
      if (messageChannel !== channel) {
        return;
      }

      cb();
    });

    client.on('error', (err) => redis.errorHandler(err));
    client.subscribe(channel);

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

  /**
   * Add an address to the Redis Refund Set and publish
   * a `new` event
   *
   * @param {Object} refund - Includes `who` and `origin`
   */
  static async addRefund ({ who, origin }) {
    await redis.sadd(FEE_REFUND_CHANNEL, JSON.stringify({ who, origin }));
    await redis.publish(FEE_REFUND_CHANNEL, 'new');
  }

  /**
   * Check if the given address is in the process
   * of a refund
   *
   * @param {Object} refund - Includes `who` and `origin`
   * @returns {Boolean}
   */
  static async isRefunding ({ who, origin }) {
    return redis.sismember(FEE_REFUND_CHANNEL, JSON.stringify({ who, origin }));
  }

  /**
   * Get the status of a refund
   *
   * @param {Object} refund - Includes `who` and `origin`
   * @return {Object|null}  - The set data of the refund, or null
   */
  static async getRefundData ({ who, origin }) {
    const key = JSON.stringify({ who, origin });

    const result = await redis.get(`${REDIS_FEE_REFUND_KEY}::${key}`);

    return result
      ? JSON.parse(result)
      : null;
  }

  /**
   * Set the status of a refund.
   * Expires after 30 minutes
   *
   * @param {Object} refund - Includes `who` and `origin`
   * @param {Object} data   - The data to store
   */
  static async setRefundData ({ who, origin }, data) {
    const key = JSON.stringify({ who, origin });

    // Expires after 30 minutes
    await redis.psetex(`${REDIS_FEE_REFUND_KEY}::${key}`, 1000 * 60 * 30, JSON.stringify(data));
  }

  /**
   * Removes an address from the Redis Refund Set.
   *
   * @param {Object} refund - Includes `who` and `origin`
   */
  static async removeRefund ({ who, origin }) {
    await redis.srem(FEE_REFUND_CHANNEL, JSON.stringify({ who, origin }));
  }
}

Store.REDIS_PENDING_TXS_KEY = REDIS_PENDING_TXS_KEY;
Store.ONFIDO_CHECKS_CHANNEL = ONFIDO_CHECKS_CHANNEL;
Store.FEE_REFUND_CHANNEL = FEE_REFUND_CHANNEL;

module.exports = Store;
