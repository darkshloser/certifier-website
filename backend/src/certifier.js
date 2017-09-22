// Copyright Parity Technologies (UK) Ltd., 2017.
// Released under the Apache 2/MIT licenses.

'use strict';

const config = require('config');

const Certifier = require('./contracts/certifier');
const Identity = require('./identity');
const Onfido = require('./onfido');
const store = require('./store');
const ParityConnector = require('./api/parity');
// const { waitForConfirmations } = require('./utils');

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
    console.warn('verifying', href);

    try {
      const verification = await Onfido.verify(href);

      await this.storeVerification(verification);
    } catch (error) {
      console.error(error);
    } finally {
      await store.remove(href);
    }
  }

  async storeVerification (verification) {
    const {
      address,
      valid,
      reason,
      pending,
      applicantId,
      checkId,
      creationDate
    } = verification;

    const identity = new Identity(address);

    try {
      // Create the applicant if not in DB
      if (!await identity.applicants.has(applicantId)) {
        await identity.applicants.store({ id: applicantId, checkId });
      }

      if (pending) {
        await identity.checks.store({ id: checkId, status: ONFIDO_STATUS.PENDING, applicantId, creationDate });
        return;
      }

      const certified = await this._certifier.isCertified(address);

      if (valid && !certified) {
        console.warn(`> certifying ${address}...`);
        await this._certifier.certify(address);
      }

      await identity.checks.store({
        id: checkId,
        status: ONFIDO_STATUS.COMPLETED,
        result: valid ? 'success' : 'fail',
        applicantId,
        reason
      });
    } catch (error) {
      console.error(error);

      await identity.checks.store({
        id: checkId,
        status: ONFIDO_STATUS.COMPLETED,
        result: 'fail',
        reason: 'error',
        applicantId,
        error: error.message
      });
    }
  }
}

AccountCertifier.run(config.get('nodeWs'), config.get('certifierContract'));
