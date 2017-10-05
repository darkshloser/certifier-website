// Copyright Parity Technologies (UK) Ltd., 2017.
// Released under the Apache 2/MIT licenses.

'use strict';

const config = require('config');

const { RpcTransport } = require('./api/transport');
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
    const transport = new RpcTransport(wsUrl);

    this._updateLock = false;
    this._verifyLock = false;
    this._connector = new ParityConnector(transport);
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

    let verification;

    try {
      verification = await Onfido.verify(href);
    } catch (error) {
      console.error(error);
      return store.remove(href);
    }

    try {
      await this.storeVerification(verification);
      await store.remove(href);
      console.warn('> verified!\n');
    } catch (error) {
      console.error(error);
    }
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
    let shouldCertify = false;

    try {
      await store.addApplicant(applicantId);
      await identity.storeVerification(verification);

      const certified = await this._certifier.isCertified(address);

      shouldCertify = valid && !certified;
    } catch (error) {
      console.error(error);

      await identity.checks.store(Object.assign({}, check, {
        status: Identity.STATUS.COMPLETED,
        result: Identity.RESULT.FAIL,
        reason: 'error',
        error: error.message
      }));
    }

    if (shouldCertify) {
      console.warn(`> certifying ${address}...`);
      await this._certifier.certify(address);
    }
  }
}

AccountCertifier.run(config.get('nodeWs'), config.get('certifierContract'));
