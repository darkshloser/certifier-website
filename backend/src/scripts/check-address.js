// Copyright Parity Technologies (UK) Ltd., 2017.
// Released under the Apache 2/MIT licenses.

'use strict';

const path = require('path');

process.env.NODE_CONFIG_DIR = path.resolve(__dirname, '../../../config');

const { intersection } = require('lodash');
const store = require('../store');
const Identity = require('../identity');

const { isValidAddress } = require('../utils');

const add = process.argv[2];

if (!isValidAddress(add)) {
  console.error('Please enter a valid address.');
  process.exit(1);
}

main(add)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

async function main (address) {
  const identity = new Identity(address);

  const applicants = await identity.applicants.getAll();
  const checks = await identity.checks.getAll();
  const documentHashes = checks.map((chk) => chk.documentHash).filter((dh) => dh);
  const linkedIdentities = [];

  if (documentHashes.length > 0) {
    await store.scanIdentities(async (idt) => {
      const iChecks = await idt.checks.getAll();
      const iDocHashse = iChecks.map((chk) => chk.documentHash).filter((dh) => dh);
      const intersect = intersection(iDocHashse, documentHashes);

      if (intersect.length > 0) {
        linkedIdentities.push(idt.address);
      }
    });
  }

  console.log('> Applicants:');

  applicants.forEach((applicant) => {
    const check = checks.find((chck) => chck.id === applicant.checkId);

    delete applicant.checkId;

    if (check) {
      delete check.applicantId;
      applicant.check = check;
    }
  });

  applicants
    .forEach((applicant) => {
      console.log(JSON.stringify(applicant, null, 2));
    });

  console.log('\n> Linked Identities:');
  console.log(JSON.stringify(linkedIdentities, null, 2));
}
