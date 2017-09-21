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
    } catch (error) {
      console.error(error);
    }
  }

  async _sync () {
    console.warn('> syncing Redis DB with Onfido...');

    // Get all identities stored in Redis
    const identities = await store.getAllIdentities();

    console.warn(`> found ${identities.length} identities in DB`);

    // Fetch the applicants for each identity
    for (let identity of identities) {
      identity.applicants.value = await identity.applicants.getAll();

      // Store the identity address for each applicant
      identity.applicants.value.forEach((app) => {
        app.address = identity.address;
      });
    }

    // Flatten the list of applicants
    const applicants = identities
      .reduce((applicants, id) => applicants.concat(id.applicants.value), []);

    // Filter applicants which are stored as completed (should be in sync)
    const completedApplicants = applicants
      .filter((applicant) => applicant.status === ONFIDO_STATUS.COMPLETED);
    const completedApplicantIds = completedApplicants.map((app) => app.id);

    console.warn(`> found ${applicants.length} applicants in DB, ${completedApplicants.length} of which are completed`);
    console.warn('> fetching list of applicants from Onfido...');

    // Get all applicants from Onfido
    const oApplicants = await Onfido.getApplicants();

    console.warn(`> found ${oApplicants.length} applicants from Onfido`);

    // We need to check the status of applicants which aren't COMPLETED locally
    const toCheckApplicants = oApplicants.filter((app) => !completedApplicantIds.includes(app.id));

    console.warn(`> there are ${toCheckApplicants.length} applicants on Onfido that needs to be synced`);

    // Get the checks from the incomplete applicants
    const oChecks = await Promise.all(toCheckApplicants.map((app) => Onfido.getChecks(app.id)));

    for (let index in toCheckApplicants) {
      const applicant = toCheckApplicants[index];
      // The right check is the most recent one
      const check = oChecks[index].sort(sorter)[0] || null;

      if (!check) {
        const creationDate = new Date(applicant.created_at);

        if (!applicants.find((app) => app.id === applicant.id)) {
          console.error(`just found an empty applicant created at ${creationDate}`);
        }

        continue;
      }

      const addresses = check.tags
        .filter((tag) => Onfido.ONFIDO_TAG_REGEX.test(tag))
        .map((tag) => {
          const [, address] = Onfido.ONFIDO_TAG_REGEX.exec(tag);

          return address;
        });

      if (addresses.length === 0) {
        console.error(`could not find any address for applicant: ${applicant.id}`, check);
        continue;
      }

      if (addresses.length > 1) {
        console.error(`found too many addresses for applicant: ${applicant.id}`);
        continue;
      }

      // There is actually only one address
      const address = addresses[0];
      const identity = new Identity(address);
      const { pending } = Onfido.checkStatus(check);
      const status = pending
        ? ONFIDO_STATUS.PENDING
        : ONFIDO_STATUS.COMPLETED;

      await identity.applicants.store({ id: applicant.id, checkId: check.id, status });
      await identity.checks.store({ id: check.id, status });

      if (!pending) {
        console.warn('SHOULD PUSH COMPLETED APP+CHECK');
      }

      // // The _right_ check is the last one created
      // const check = applicant.checks
      //   .sort((chA, chB) => new Date(chB['created_at']) - new Date(chA['created_at']))[0];

      // const storedApp = stored[address];
      // const status = Onfido.checkStatus(check);

      // const applicantId = applicant.id;
      // const checkId = check.id;

      // // If the check is still pending, let it go...
      // if (storedApp && storedApp.status === ONFIDO_STATUS.PENDING && status.pending) {
      //   console.warn(`check ${applicantId}/${checkId} for ${address} is still pending...`);
      //   continue;
      // }

      // // If we already had an entry for this address, it might be a duplicate
      // if (storedApp && storedApp.status === ONFIDO_STATUS.COMPLETED) {
      //   console.warn(`${address} might have multiple applicant ids... ${[
      //     storedApp.applicantId,
      //     applicantId
      //   ].join(' ; ')}`);

      //   continue;
      // }

      // // Otherwise, fetch the result (if needed) and sotre it in Redis
      // console.warn(`updating check ${applicantId}/${checkId} for ${address}...`);
      // const verification = await Onfido.verifyCheck({ applicantId, checkId }, check);

      // await this.storeVerification(verification);
    }
  }
}

module.exports = new Synchronizer();
