// Copyright Parity Technologies (UK) Ltd., 2017.
// Released under the Apache 2/MIT licenses.

'use strict';

const Identity = require('./identity');
const Onfido = require('./onfido');
const store = require('./store');

const { ONFIDO_STATUS } = Onfido;

function sorter (dataA, dataB) {
  const dateA = new Date(dataA.created_at);
  const dateB = new Date(dataB.created_at);

  return dateB - dateA;
}

class Synchronizer {
  constructor () {
    this.sync();
    // Sync with Onfido every 30 minutes
    // setInterval(() => this.sync(), 30 * 60 * 1000);
  }

  async sync () {
    try {
      await this._sync();
      console.warn('\n> syncing done!');
    } catch (error) {
      console.error(error);
    }

    // process.exit(0);
  }

  async _sync () {
    console.warn('> syncing Redis DB with Onfido...\n');

    // Get all identities stored in Redis
    const identities = await store.getAllIdentities();
    const applicants = [];

    console.warn(`> found ${identities.length} identities in DB`);

    // Fetch the applicants for each identity
    for (let identity of identities) {
      for (let applicant of await identity.applicants.getAll()) {
        if (applicant.checkId) {
          applicant.check = await identity.checks.get(applicant.checkId);
        }

        applicants.push(applicant);
      }
    }

    // Filter applicants which are stored as completed (should be in sync)
    const completedApplicants = applicants
      .filter((applicant) => applicant.check.status === ONFIDO_STATUS.COMPLETED);
    const completedApplicantIds = completedApplicants.map((app) => app.id);
    const invalidApplicantIds = await store.getInvalidApplicantIds();

    console.warn(`> found ${invalidApplicantIds.length} invalid applicant ids in DB`);
    console.warn(`> found ${applicants.length} applicants in DB, ${completedApplicants.length} of which are completed`);
    console.warn('> fetching number of applicants from Onfido...');

    const oApplicantsCount = await Onfido.getApplicantsCount();

    console.warn(`> there are ${oApplicantsCount} applicants in Onfido`);

    if (oApplicantsCount === completedApplicants.length + invalidApplicantIds.length) {
      console.warn('> all applicants are synced');
      return;
    }

    // Get all applicants from Onfido
    console.warn('> fetching list of applicants from Onfido...');
    const oApplicants = await Onfido.getApplicants();

    console.warn(`> found ${oApplicants.length} applicants from Onfido`);

    // We need to check the status of applicants which aren't COMPLETED locally
    // and are not stored as invalid (eg. wrong or no address)
    const toCheckApplicants = oApplicants
      .filter((app) => !completedApplicantIds.includes(app.id) && !invalidApplicantIds.includes(app.id));

    console.warn(`> there are ${toCheckApplicants.length} applicants on Onfido that needs to be synced`);
    // Get the checks from the incomplete applicants
    const oChecks = {};

    // Get the checks in serie
    for (let applicant of toCheckApplicants) {
      oChecks[applicant.id] = await Onfido.getChecks(applicant.id);
    }

    for (let applicant of toCheckApplicants) {
      // The right check is the most recent one
      const check = oChecks[applicant.id].sort(sorter)[0] || null;

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

          continue;
        }

        console.warn(`> empty applicant created at ${creationDate}`);
        continue;
      }

      const addresses = check.tags
        .filter((tag) => Onfido.ONFIDO_TAG_REGEX.test(tag))
        .map((tag) => {
          const [, address] = Onfido.ONFIDO_TAG_REGEX.exec(tag);

          return address;
        });

      if (addresses.length === 0 || addresses.length > 1) {
        console.error(`could not find an address for "/applicants/${applicant.id}/checks/${check.id}`);
        store.addInvalidApplicantId(applicant.id);
        continue;
      }

      // There is actually only one address
      const address = addresses[0];
      const identity = new Identity(address);
      const { pending } = Onfido.checkStatus(check);
      const status = pending
        ? ONFIDO_STATUS.PENDING
        : ONFIDO_STATUS.COMPLETED;

      await identity.applicants.store({ id: applicant.id, checkId: check.id });
      await identity.checks.store({ id: check.id, applicantId: applicant.id, creationDate: check.created_at, status });

      if (!pending) {
        console.warn(`> add completed check to queue "/applicants/${applicant.id}/checks/${check.id}"`);
        store.push(check.href);
        continue;
      }

      console.warn(`> check is pending "/applicants/${applicant.id}/checks/${check.id}"`);
    }
  }
}

module.exports = new Synchronizer();
