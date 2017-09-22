// Copyright Parity Technologies (UK) Ltd., 2017.
// Released under the Apache 2/MIT licenses.

'use strict';

const config = require('config');
const qs = require('qs');
const fetch = require('node-fetch');
// const fetch = require('/home/nicolas/Scripts/fetch');
const parseLink = require('parse-link-header');

const store = require('./store');
const { keccak256 } = require('./utils');

const { token } = config.get('onfido');

const ONFIDO_STATUS = {
  UNKNOWN: 'unknown',
  CREATED: 'created',
  PENDING: 'pending',
  COMPLETED: 'completed'
};

const ONFIDO_URL_REGEX = /applicants\/([a-z0-9-]+)\/checks\/([a-z0-9-]+)$/i;
const ONFIDO_TAG_REGEX = /^address:(0x[0-9abcdef]{40})$/i;
const SANDBOX_DOCUMENT_HASH = hashDocumentNumbers([{
  type: 'passport',
  value: '9999999999'
}]);

/**
 * Make a call to the Onfido API (V2)
 *
 * @param {String} endpoint path
 * @param {String} method   `GET` | `POST` | ...
 * @param {Object} data     for POST requests
 *
 * @return {Object|String} response from the API, JSON is automatically parsed
 */
async function _call (endpoint, method = 'GET', data = {}, attempts = 0) {
  const headers = {
    Authorization: `Token token=${token}`
  };

  if (method === 'POST') {
    headers['Content-Type'] = 'application/x-www-form-urlencoded;charset=UTF-8';
  }

  const url = endpoint.includes('api.onfido.com')
    ? endpoint
    : `https://api.onfido.com/v2${endpoint}`;

  const options = { method, headers };

  if (method === 'POST') {
    options.body = qs.stringify(data, { arrayFormat: 'brackets', encode: false });
  }

  const r = await fetch(url, options);

  // Too many requests
  if (r.status === 429) {
    const timeout = Math.floor(Math.random() * Math.pow(2, attempts) * 1000);

    console.warn(`[Too Many Request] will retry in ${Math.round(timeout / 1000)}s`);
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        _call(endpoint, method, data, attempts + 1).then(resolve).catch(reject);
      }, timeout);
    });
  }

  const rc = r.clone();
  const link = r.headers.get('link');
  const count = r.headers.get('x-total-count');

  let result;

  try {
    result = await r.json();
  } catch (error) {
    result = await rc.text();
  }

  if (result && result.error) {
    console.warn('onfido error', result.error);
    throw new Error(result.error.message);
  }

  if (link) {
    result._links = parseLink(link);
  }

  if (count) {
    result._count = parseInt(count);
  }

  return result;
}

/**
 * Get applicants from Onfido
 *
 * @return {Array} list of all applicants
 */
async function getApplicants () {
  const result = await _call(`/applicants/?per_page=50`, 'GET');

  let applicants = result.applicants.slice();
  let links = result._links;

  while (links && links.next) {
    const nextResult = await _call(links.next.url, 'GET');

    applicants = applicants.concat(nextResult.applicants);
    links = nextResult._links;
  }

  return applicants;
}

async function getApplicantsCount () {
  const result = await _call(`/applicants/?per_page=1`, 'GET');

  return result._count || 0;
}

/**
 * Get the check from Onfido
 *
 * @param {String} applicantId
 * @param {String} checkId
 *
 * @return {Object} check returned by the Onfido API
 */
async function getCheck (applicantId, checkId) {
  return _call(`/applicants/${applicantId}/checks/${checkId}`, 'GET');
}

/**
 * Get all checks from one applicant from Onfido
 *
 * @param {String} applicantId
 *
 * @return {Array} list of all applicant's checks
 */
async function getChecks (applicantId) {
  const result = await _call(`/applicants/${applicantId}/checks`, 'GET');

  return result.checks;
}

/**
 * Fetches reports for a given checkId
 *
 * @param {String} checkId
 *
 * @return {Array<Object>} reports returned by Onfido API
 */
async function getReports (checkId) {
  const { reports } = await _call(`/checks/${checkId}/reports`, 'GET');

  return reports;
}

/**
 * Get the status of a check
 *
 * @param {Object} check returned from getCheck()
 *
 * @return {Object} contains booleans: `pending` and `valid`
 */
function checkStatus (check) {
  const { status, result } = check;

  const pending = status === 'in_progress';
  const valid = status === 'complete' && result === 'clear';

  return { pending, valid };
}

/**
 * Create an Onfido check for an applicant
 *
 * @param {String} applicantId from Onfido
 * @param {String} address     `0x` prefixed
 *
 * @return {Object} containing `checkId` (String)
 */
async function createCheck (applicantId, address) {
  const check = await _call(`/applicants/${applicantId}/checks`, 'POST', {
    type: 'express',
    report_type_groups: [ '4846' ],
    tags: [ `address:${address}` ]
  });

  return { checkId: check.id };
}

/**
 * Create an applicant on Onfido
 *
 * @param {String} options.country
 * @param {String} options.firstName
 * @param {String} options.lastName
 *
 * @return {Object} contains `applicantId` (String) and `sdkToken` (String)
 */
async function createApplicant ({ firstName, lastName }) {
  const applicant = await _call('/applicants', 'POST', {
    first_name: firstName,
    last_name: lastName
  });

  const sdkToken = await createToken(applicant.id);

  return { applicantId: applicant.id, sdkToken };
}

/**
 * Delete an applicant on Onfido (will
 * work only for applicants with no checks)
 *
 * @param {String} applicantId
 */
async function deleteApplicant (applicantId) {
  await _call(`/applicants/${applicantId}`, 'DELETE');
}

async function createToken (applicantId) {
  const sdk = await _call('/sdk_token', 'POST', {
    applicant_id: applicantId,
    referrer: '*://*/*'
  });

  return sdk.token;
}

/**
 * Verify an URL onfido check and trigger the transaction to the
 * Certifier contract if the check is successful
 *
 * @param {String} href in format: https://api.onfido.com/v2/applicants/<applicant-id>/checks/<check-id>
 *
 * @return {Object} contains `address` (String), `valid` (Boolean) and `country` (String)
 */
async function verify (href) {
  if (!ONFIDO_URL_REGEX.test(href)) {
    throw new Error(`wrong onfido URL: ${href}`);
  }

  const [, applicantId, checkId] = ONFIDO_URL_REGEX.exec(href);
  const check = await getCheck(applicantId, checkId);

  return verifyCheck({ applicantId, checkId }, check);
}

async function verifyCheck ({ applicantId, checkId }, check) {
  const creationDate = check.created_at;
  const status = checkStatus(check);
  const addressTag = check.tags.find((tag) => ONFIDO_TAG_REGEX.test(tag));

  if (!addressTag) {
    throw new Error(`could not find an address for "/applicants/${applicantId}/checks/${checkId}"`);
  }

  const [, address] = ONFIDO_TAG_REGEX.exec(addressTag);

  if (status.pending) {
    return { applicantId, checkId, address, creationDate, pending: true };
  }

  let reason = check.result;
  let { valid } = status;

  const reports = await getReports(checkId);
  const documentReport = reports.find((report) => report.name === 'document');

  if (valid && documentReport) {
    const documentInvalidReason = await verifyDocument(documentReport);

    if (documentInvalidReason) {
      reason = documentInvalidReason;
      valid = false;
    }
  } else {
    const unclearReport = reports.find((report) => report.result !== 'clear');

    valid = false;

    if (unclearReport) {
      reason = unclearReport.sub_result || unclearReport.result;
    }
  }

  return { applicantId, checkId, address, valid, reason, creationDate };
}

/**
 * Deterministic way to hash the array of document numbers
 *
 * @param {Array} documentNumbers array of document numbers as returned from Onfido
 *
 * @return {String} keccak256 hash
 */
function hashDocumentNumbers (documentNumbers) {
  const string = documentNumbers
    .map(({ value, type }) => `${value}:${type}`)
    .sort()
    .join(',');

  return keccak256(string);
}

/**
 * Check that the document isn't from US and hasn't been used before
 *
 * @param {Object} documentReport as sent from Onfido
 *
 * @return {String|null} string reason for rejection, or null if okay
 */
async function verifyDocument (documentReport) {
  const { properties } = documentReport;
  const countryCode = properties['nationality'] || properties['issuing_country'];

  if (countryCode && countryCode.toUpperCase() === 'USA') {
    return 'blocked-country';
  }

  const hash = hashDocumentNumbers(properties['document_numbers']);

  // Allow sandbox documents to go through
  if (hash === SANDBOX_DOCUMENT_HASH) {
    return null;
  }

  if (store.hasDocumentBeenUsed(hash)) {
    return 'used-document';
  }

  store.markDocumentAsUsed(hash);

  return null;
}

module.exports = {
  checkStatus,
  createApplicant,
  createCheck,
  createToken,
  deleteApplicant,
  getApplicants,
  getApplicantsCount,
  getCheck,
  getChecks,
  verify,
  verifyCheck,

  ONFIDO_STATUS,
  ONFIDO_TAG_REGEX
};
