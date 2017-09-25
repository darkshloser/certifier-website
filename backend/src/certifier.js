// Copyright Parity Technologies (UK) Ltd., 2017.
// Released under the Apache 2/MIT licenses.

'use strict';

const config = require('config');

const Certifier = require('./contracts/certifier');
const Identity = require('./identity');
const Onfido = require('./onfido');
const store = require('./store');
const ParityConnector = require('./api/parity');

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
      await store.subscribe(async () => this.verifyOnfidos());
      console.warn('\n> Started account certifier!\n');
    } catch (error) {
      console.error(error);
    }
  }

  async verifyOnfidos () {
    if (this._verifyLock) {
      return;
    }

    this._verifyLock = true;

    await store.scan(async (href) => this.verifyOnfido(href));

    this._verifyLock = false;
  }

  async verifyOnfido (href) {
    console.warn(`> verifying ${href}...`);

    try {
      const verification = await Onfido.verify(href);

      await this.storeVerification(verification);
    } catch (error) {
      console.error(error);
    } finally {
      await store.remove(href);
    }

    console.warn(`> verified!\n`);
  }

  async storeVerification (verification) {
    const {
      address,
      valid,
      applicantId,
      checkId,
      creationDate,
      documentHash
    } = verification;

    const check = { id: checkId, applicantId, creationDate, documentHash };
    const identity = new Identity(address);

    try {
      await store.addApplicant(applicantId);
      await identity.storeVerification(verification);

      const certified = await this._certifier.isCertified(address);

      if (valid && !certified) {
        console.warn(`> certifying ${address}...`);
        await this._certifier.certify(address);
      }
    } catch (error) {
      console.error(error);

      await identity.checks.store(Object.assign({}, check, {
        status: Identity.STATUS.COMPLETED,
        result: Identity.RESULT.FAIL,
        reason: 'error',
        error: error.message
      }));
    }
  }
}

AccountCertifier.run(config.get('nodeWs'), config.get('certifierContract'));
