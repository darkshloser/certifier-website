import BigNumber from 'bignumber.js';

import { get, post } from './utils';

class Backend {
  constructor (url) {
    this._url = url;
  }

  blockHash () {
    return get(this.url('/block/hash'));
  }

  async config () {
    const { gasPrice } = await get(this.url('/config'));

    return {
      gasPrice: new BigNumber(gasPrice)
    };
  }

  url (path) {
    return `${this._url}/api${path}`;
  }

  async getAccountIncomingTxs (address) {
    const { incomingTxs } = await get(this.url(`/accounts/${address}/incoming-txs`));

    return { incomingTxs };
  }

  async getAccountFeeInfo (address) {
    const { balance, paid, origins } = await get(this.url(`/accounts/${address}/fee`));

    return {
      balance: new BigNumber(balance),
      paid,
      origins
    };
  }

  async checkStatus (address) {
    return get(this.url(`/onfido/${address}`));
  }

  async createApplicant (address, { country, firstName, lastName, signature, message }) {
    console.warn('sending `createApplicant` from FE to BE');

    return post(this.url(`/onfido/${address}/applicant`), {
      country,
      firstName,
      lastName,
      signature,
      message
    });
  }

  async createCheck (address, { sdkToken }) {
    return post(this.url(`/onfido/${address}/check`), { sdkToken });
  }

  async certifierAddress () {
    const { certifier } = await get(this.url(`/certifier`));

    return certifier;
  }

  async fee () {
    const { fee, feeRegistrar } = await get(this.url(`/fee`));

    return { fee: new BigNumber(fee), feeRegistrar };
  }

  async nonce (address) {
    const { nonce } = await get(this.url(`/accounts/${address}/nonce`));

    return nonce;
  }

  async sendFeeTx (tx) {
    const { hash } = await post(this.url('/fee-tx'), { tx });

    return { hash };
  }

  async sendTx (tx) {
    const { hash, requiredEth } = await post(this.url('/tx'), { tx });

    return { hash, requiredEth };
  }
}

const { protocol, hostname, port } = window.location;
const frontendPort = port ? `:${port}` : '';

export default new Backend(`${protocol}//${hostname}${frontendPort}`);
