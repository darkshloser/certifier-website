import BigNumber from 'bignumber.js';

import { get, post, sleep } from './utils';

class Backend {
  constructor (url) {
    this._url = url;
  }

  url (path) {
    return `${this._url}/api${path}`;
  }

  async errorHandler (error, attempts, callback) {
    // Can retry up to 5 times if client error
    if ((error.status < 400 || error.status >= 500) && attempts < 4) {
      const timeout = Math.floor(Math.pow(1.6, attempts) * 1000);

      console.warn(`[${error.status}] ${error.message} - will retry in ${Math.round(timeout / 1000)}s`);
      await sleep(timeout);
      return callback();
    }

    throw error;
  }

  async get (path, attempts = 0) {
    try {
      const result = await get(this.url(path));

      return result;
    } catch (error) {
      return this.errorHandler(error, attempts, async () => this.get(path, attempts + 1));
    }
  }

  async post (path, params, attempts = 0) {
    try {
      const result = await post(this.url(path), params);

      return result;
    } catch (error) {
      return this.errorHandler(error, attempts, async () => this.post(path, params, attempts + 1));
    }
  }

  async balance (address) {
    const { balance } = await this.get(`/accounts/${address}/balance`);

    return new BigNumber(balance);
  }

  async blockHash () {
    return this.get('/block/hash');
  }

  async certificationLocked (address) {
    const { locked } = await this.get(`/accounts/${address}/certification-locked`);

    return locked;
  }

  async certifierAddress () {
    const { certifier } = await this.get(`/certifier`);

    return certifier;
  }

  async checkRecertificationStatus (address) {
    const { error, status, transactions } = await this.get(`/accounts/${address}/recertification`);

    return { error, status, transactions };
  }

  async checkStatus (address) {
    return this.get(`/onfido/${address}`);
  }

  async createApplicant (address, { country, firstName, lastName, signature, message }) {
    console.warn('sending `createApplicant` from FE to BE');

    return this.post(`/onfido/${address}/applicant`, {
      country,
      firstName,
      lastName,
      signature,
      message
    });
  }

  async createCheck (address, { sdkToken }) {
    return this.post(`/onfido/${address}/check`, { sdkToken });
  }

  async config () {
    const { chainId, etherscan, gasPrice } = await this.get('/config');

    return {
      chainId: parseInt(chainId),
      etherscan: etherscan,
      gasPrice: new BigNumber(gasPrice)
    };
  }

  async fee () {
    const { fee, feeRegistrar } = await this.get(`/fee`);

    return { fee: new BigNumber(fee), feeRegistrar };
  }

  async getAccountFeeInfo (address) {
    const { balance, paid, origins } = await this.get(`/accounts/${address}/fee`);

    return {
      balance: new BigNumber(balance),
      paid,
      origins
    };
  }

  async getAccountIncomingTxs (address) {
    const { incomingTxs } = await this.get(`/accounts/${address}/incoming-txs`);

    return { incomingTxs };
  }

  async getRefund ({ address, message, signature }) {
    const { status } = await this.post(`/accounts/${address}/refund`, { message, signature });

    return status;
  }

  async getRefundStatus ({ who, origin }) {
    const { status, transaction } = await this.get(`/accounts/${who}/refund/${origin}`);

    return { status, transaction };
  }

  async nonce (address) {
    const { nonce } = await this.get(`/accounts/${address}/nonce`);

    return nonce;
  }

  async recertifier () {
    const { address, fee } = await this.get('/recertifier');

    return {
      fee: new BigNumber(fee),
      address
    };
  }

  async sendTx (tx) {
    const { hash } = await this.post('/tx', { tx });

    return { hash };
  }
}

const { protocol, hostname, port } = window.location;
const frontendPort = port ? `:${port}` : '';

export default new Backend(`${protocol}//${hostname}${frontendPort}`);
