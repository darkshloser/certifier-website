// Copyright Parity Technologies (UK) Ltd., 2017.
// Released under the Apache 2/MIT licenses.

'use strict';

const config = require('config');

const Certifier = require('./contracts/certifier');
const Onfido = require('./onfido');
const store = require('./store');
const ParityConnector = require('./api/parity');
const { waitForConfirmations } = require('./utils');

const { ONFIDO_STATUS } = Onfido;

class AccountCertifier {
  static run (wsUrl, contractAddress) {
    return new AccountCertifier(wsUrl, contractAddress);
  }

  constructor (wsUrl, contractAddress) {
    this._updateLock = false;
    this._verifyLock = false;

    this._connector = new ParityConnector(wsUrl);
    this._certifier = new Certifier(this._connector, contractAddress);

    this.init();
  }

  async init () {
    try {
      await store.Onfido.subscribe(async () => this.verifyOnfidos());
      console.warn('Started account certifier!');
    } catch (error) {
      console.error(error);
    }
  }

  async verifyOnfidos () {
    if (this._verifyLock) {
      return;
    }

    this._verifyLock = true;

    await store.Onfido.scan(async (href) => this.verifyOnfido(href));

    this._verifyLock = false;
  }

  async verifyOnfido (href) {
    try {
      console.warn('verifying', href);
      const { valid, address, reason } = await Onfido.verify(href);

      if (valid) {
        console.warn('certifying', address);
        const tx = await this._certifier.certify(address);

        await waitForConfirmations(this._connector, tx);
      }

      await store.Onfido.set(address, {
        status: ONFIDO_STATUS.COMPLETED,
        result: valid ? 'success' : 'fail',
        reason
      });
    } catch (error) {
      console.error(error);
      await store.Onfido.set(address, {
        status: ONFIDO_STATUS.COMPLETED,
        result: 'fail',
        reason: `Error: ${error.message}`
      });
    } finally {
      await store.Onfido.remove(href);
    }
  }
}

AccountCertifier.run(config.get('nodeWs'), config.get('certifierContract'));
