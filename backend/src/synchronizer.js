// Copyright Parity Technologies (UK) Ltd., 2017.
// Released under the Apache 2/MIT licenses.

'use strict';

const Identity = require('./identity');
const Onfido = require('./onfido');
const store = require('./store');

function sorter (dataA, dataB) {
  const dateA = new Date(dataA.created_at);
  const dateB = new Date(dataB.created_at);

  return dateB - dateA;
}

class Synchronizer {
  constructor () {
    // this.verify();
    this.sync();
    // Sync with Onfido every 30 minutes
    // setInterval(() => this.sync(), 30 * 60 * 1000);
  }

  async verify () {
    try {
      await this._verify();
      console.warn('\n> verification done!');
    } catch (error) {
      console.error(error);
    }
  }

  async _verify () {
    console.warn('> verifying Redis DB data...\n');

    await store.scanIdentities(async (identity) => {
      let checks = await identity.checks.getAll();

      const hrefs = checks
        .filter((check) => {
          // Every check must have a creation date
          if (!check.creationDate) {
            return true;
          }

          // Every successful check must include a document hash
          if (check.status === Identity.RESULT.SUCCESS && !check.documentHash) {
            return true;
          }

          return false;
        })
        .map((check) => `/applicants/${check.applicantId}/checks/${check.id}`);

      if (hrefs.length > 0) {
        console.warn(`> found ${hrefs.length} checks to update`);

        for (let href of hrefs) {
          await store.push(href);
        }
      }

      // Mark all document as used
      const documentHashes = checks
        .map((check) => check.documentHash)
        .filter((dh) => dh);

      for (let documentHash of documentHashes) {
        await store.markDocumentAsUsed(documentHash);
      }
    });
  }

  async sync () {
    try {
      await this._sync();
      console.warn('\n> syncing done!');
    } catch (error) {
      console.error(error);
    }
  }

  async _sync () {
    console.warn('> syncing Redis DB with Onfido...\n');

    console.warn('> syncing local applicants...');
    // Scan all identities stored in Redis
    await store.scanIdentities(async (identity) => {
      const applicants = await identity.applicants.getAll();

      // Sync all stored applicants
      for (let applicant of applicants) {
        await this.syncApplicant(identity, applicant);
      }
    });

    console.warn('> getting applicant count from Onfido...');
    const sApplicantsCount = await store.countApplicants();
    const oApplicantsCount = await Onfido.getApplicantsCount();

    if (sApplicantsCount >= oApplicantsCount) {
      console.warn('> got all applicants in DB');
      return;
    }

    console.warn(`> missing at least ${oApplicantsCount - sApplicantsCount} applicants`);

    // Iterate through all applicants on Onfido
    // until we got them all in DB
    await Onfido.getApplicants(async (applicant) => {
      // If already in DB, continue
      if (await store.hasApplicant(applicant.id)) {
        return true;
      }

      // Otherwise, fetch the checks and sync the identity
      await this.syncApplicant(null, applicant);

      // Re-count the number of applicants in DB
      const nextApplicantsCount = await store.countApplicants();

      // continue the scan if not enough applicants
      return nextApplicantsCount < oApplicantsCount;
    });
  }

  async syncCheck (identity, applicant, _check) {
    console.warn(`> syncing check for ${identity.address} ...`);

    const { address } = identity;
    const { id: applicantId } = applicant;
    let check = _check;

    // Get check from Onfido if not given
    if (!check) {
      const { checkId } = applicant;

      check = await Onfido.getCheck(applicantId, checkId);
    }

    // Get the verification result from Onfido
    const verification = await Onfido.verifyCheck({ applicantId, checkId: check.id }, address, check);

    // Save in Redis
    await identity.storeVerification(verification);
  }

  async syncApplicant (identity, applicant) {
    // Add the applicant id in Redis
    await store.addApplicant(applicant.id);

    // Check is already in DB
    if (identity && applicant.checkId) {
      const storedCheck = await identity.checks.get(applicant.checkId);

      // If completed, skip the applicant
      if (storedCheck && storedCheck.status === Identity.STATUS.COMPLETED) {
        return;
      }

      // Otherwise, fetch check status from Onfido
      // and update DB value
      return this.syncCheck(identity, applicant);
    }

    // No check in DB, get it, if any, from Onfido
    let checks = [];

    try {
      checks = await Onfido.getChecks(applicant.id);
    } catch (error) {
      if (/could not find/i.test(error.message)) {
        console.warn('> applicant not found on Onfido... ' + applicant.id);
        return identity.applicants.del(applicant.id);
      }

      console.error(error.message);
    }

    // The right check is the most recent one
    const check = checks.sort(sorter)[0] || null;

    if (!check && !applicant.created_at) {
      console.warn('> empty applicant... ' + applicant.id);
      return identity.applicants.del(applicant.id);
    }

    if (!check) {
      const creationDate = new Date(applicant.created_at);

      // Created more than 12h ago, no checks => DELETE
      if (Date.now() - creationDate > 1000 * 3600 * 12) {
        console.warn(`> empty applicant created more than 12h ago (on ${creationDate}) ; deleting...`);

        try {
          await Onfido.deleteApplicant(applicant.id);
        } catch (error) {
          console.error(`> ${error.message.split('\n')[0]}`);
        }

        return;
      }

      console.warn(`> empty applicant created at ${creationDate}`);
      return;
    }

    // If no identity given, try to find the
    // address in the check's tags
    if (!identity) {
      const addresses = check.tags
        .filter((tag) => Onfido.ONFIDO_TAG_REGEX.test(tag))
        .map((tag) => {
          const [, address] = Onfido.ONFIDO_TAG_REGEX.exec(tag);

          return address;
        });

      if (addresses.length === 0 || addresses.length > 1) {
        console.error(`could not find an address for "/applicants/${applicant.id}/checks/${check.id}`);
        return;
      }

      // There is actually only one address
      identity = new Identity(addresses[0]);
    }

    await identity.applicants.store({ id: applicant.id, checkId: check.id });
    return this.syncCheck(identity, applicant, check);
  }
}

module.exports = new Synchronizer();
