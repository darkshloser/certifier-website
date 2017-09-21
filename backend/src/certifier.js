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
    // this.sync();

    // Sync with Onfido every 30 minutes
    // setInterval(() => this.sync(), 30 * 60 * 1000);
  }

  async init () {
    try {
      await store.subscribe(async () => this.verifyOnfidos());
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

    await store.scan(async (href) => this.verifyOnfido(href));

    this._verifyLock = false;
  }

  async verifyOnfido (href) {
    console.warn('verifying', href);
    let address;

    try {
      const verification = await Onfido.verify(href);

      address = verification.address;
      await this.storeVerification(verification);
    } catch (error) {
      console.error(error);

      if (address) {
        await store.set(address, {
          status: ONFIDO_STATUS.COMPLETED,
          result: 'fail',
          reason: 'error',
          error: error.message
        });
      }
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
      checkId
    } = verification;

    try {
      if (pending) {
        await store.set(address, {
          status: ONFIDO_STATUS.PENDING,
          applicantId, checkId
        });

        return;
      }

      const certified = await this._certifier.isCertified(address);

      if (valid && !certified) {
        console.warn('certifying', address);
        const tx = await this._certifier.certify(address);

        await waitForConfirmations(this._connector, tx);
      } else if (valid && certified) {
        console.warn(`${address} is already certified...`);
      }

      await store.set(address, {
        status: ONFIDO_STATUS.COMPLETED,
        result: valid ? 'success' : 'fail',
        reason,
        applicantId, checkId
      });
    } catch (error) {
      console.error(error);

      await store.set(address, {
        status: ONFIDO_STATUS.COMPLETED,
        result: 'fail',
        reason: 'error',
        error: error.message,
        applicantId, checkId
      });
    }
  }

  async sync () {
    try {
      await this._sync();
    } catch (error) {
      console.error(error);
    }
  }

  async _sync () {
    const stored = await store.getAll();
    const sAddresses = Object.keys(stored);

    // The stored values in Redis or COMPLETED (and we know it's the right info),
    // or not COMPLETED (might be PENDING, CREATED, UNKNOWN)
    const completeAddresses = sAddresses.filter((add) => stored[add].status === ONFIDO_STATUS.COMPLETED);
    const completeApplicantIds = completeAddresses.map((add) => stored[add].applicantId);

    const applicants = await Onfido.getApplicants();

    // We need to check the status of applicants which aren't COMPLETED locally
    const toCheckApplicants = applicants.filter((app) => !completeApplicantIds.includes(app.id));

    // Get the checks from the incomplete applicants
    const checks = await Promise.all(toCheckApplicants.map((app) => Onfido.getChecks(app.id)));

    for (let index in toCheckApplicants) {
      const applicant = toCheckApplicants[index];

      applicant.checks = checks[index];

      if (applicant.checks.length === 0) {
        console.warn(`could not find any checks for applicant: ${applicant.id}`);
        continue;
      }

      const addresses = [];

      applicant.checks.forEach((check) => {
        check.tags
          .filter((tag) => Onfido.ONFIDO_TAG_REGEX.test(tag))
          .forEach((tag) => {
            const [, address] = Onfido.ONFIDO_TAG_REGEX.exec(tag);

            if (!addresses.includes(address)) {
              addresses.push(address);
            }
          });
      });

      applicant.addresses = addresses;

      if (addresses.length === 0) {
        console.warn(`could not find any address for applicant: ${applicant.id}`);
        continue;
      }

      if (addresses.length > 1) {
        console.warn(`found too many addresses for applicant: ${applicant.id}`);
        continue;
      }

      // There is actually only one address
      const address = addresses[0];

      // The _right_ check is the last one created
      const check = applicant.checks
        .sort((chA, chB) => new Date(chB['created_at']) - new Date(chA['created_at']))[0];

      const storedApp = stored[address];
      const status = Onfido.checkStatus(check);

      const applicantId = applicant.id;
      const checkId = check.id;

      // If the check is still pending, let it go...
      if (storedApp && storedApp.status === ONFIDO_STATUS.PENDING && status.pending) {
        console.warn(`check ${applicantId}/${checkId} for ${address} is still pending...`);
        continue;
      }

      // If we already had an entry for this address, it might be a duplicate
      if (storedApp && storedApp.status === ONFIDO_STATUS.COMPLETED) {
        console.warn(`${address} might have multiple applicant ids... ${[
          storedApp.applicantId,
          applicantId
        ].join(' ; ')}`);

        continue;
      }

      // Otherwise, fetch the result (if needed) and sotre it in Redis
      console.warn(`updating check ${applicantId}/${checkId} for ${address}...`);
      const verification = await Onfido.verifyCheck({ applicantId, checkId }, check);

      await this.storeVerification(verification);
    }
  }
}

AccountCertifier.run(config.get('nodeWs'), config.get('certifierContract'));
