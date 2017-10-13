// Copyright Parity Technologies (UK) Ltd., 2017.
// Released under the Apache 2/MIT licenses.

'use strict';

const config = require('config');
const qs = require('qs');
const fetch = require('node-fetch');
const parseLink = require('parse-link-header');

const store = require('./store');
const { keccak256, sleep } = require('./utils');

const { token } = config.get('onfido');

const ONFIDO_URL_REGEX = /applicants\/([a-z0-9-]+)\/checks\/([a-z0-9-]+)$/i;
const ONFIDO_TAG_REGEX = /^address:(0x[0-9abcdef]{40})$/i;
const SANDBOX_DOCUMENT_HASH = hashDocumentNumbers([{
  type: 'passport',
  value: '9999999999'
}]);
const BLOCKED_COUNTRIES = new Set([ 'USA' ]);
const PEPS_PATTERN = /\bpep[s-]?\b/i;

/// Get the Report Types
// _call('/report_type_groups').then((data) => console.log(JSON.stringify(data, null, 2)));

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

  const response = await fetch(url, options);

  // Too many requests
  if (response.status === 429) {
    const timeout = Math.floor(Math.pow(2, attempts) * 1000);

    console.warn(`[Too Many Request] will retry in ${Math.round(timeout / 1000)}s`);
    await sleep(timeout);
    return _call(endpoint, method, data, attempts + 1);
  }

  const link = response.headers.get('link');
  const count = response.headers.get('x-total-count');

  let result = await response.text();

  try {
    result = JSON.parse(result);
  } catch (error) {
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
 * @param {Function} callback  - Callback function called
 *                             for each applicant. Returns wether
 *                             we should fetch more applicants or
 *                             not.
 */
async function getApplicants (callback) {
  let links = { next: { url: '/applicants/?per_page=40' } };

  while (links && links.next) {
    const result = await _call(links.next.url, 'GET');

    for (let applicant of result.applicants) {
      const continueFetch = await callback(applicant);

      if (!continueFetch) {
        return;
      }
    }

    links = result._links;
  }
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
 * Get all documents from one applicant from Onfido
 *
 * @param {String} applicantId
 *
 * @return {Array} list of all applicant's documents
 */
async function getDocuments (applicantId) {
  const result = await _call(`/applicants/${applicantId}/documents`, 'GET');

  return result.documents;
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
  const { status } = check;

  const pending = status === 'in_progress';
  const complete = status === 'complete';

  return { pending, complete };
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
    report_type_groups: [ '4999' ],
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

  const addressTag = check.tags.find((tag) => ONFIDO_TAG_REGEX.test(tag));

  if (!addressTag) {
    throw new Error(`could not find an address for "/applicants/${applicantId}/checks/${checkId}"`);
  }

  const [, address] = ONFIDO_TAG_REGEX.exec(addressTag);

  return verifyCheck({ applicantId, checkId }, address, check);
}

async function verifyCheck ({ applicantId, checkId }, address, check) {
  const creationDate = check.created_at;
  const status = checkStatus(check);
  const result = { applicantId, checkId, address, creationDate };

  if (status.pending) {
    result.pending = true;
    return result;
  }

  const { complete } = status;

  const reports = await getReports(checkId);
  const documentReport = reports.find((report) => report.name === 'document');
  const watchlistReport = reports.find((report) => report.name === 'watchlist');

  let valid = complete && documentReport && watchlistReport;

  if (valid) {
    const dob = documentReport.properties.date_of_birth;
    const watchlistVerification = verifyWatchlist(watchlistReport, dob);

    if (!watchlistVerification.valid) {
      result.reason = watchlistVerification.reason;
      result.valid = false;
      return result;
    }

    const documentVerification = await verifyDocument(documentReport);

    if (documentVerification.hash) {
      result.documentHash = documentVerification.hash;
    }

    if (!documentVerification.valid) {
      result.reason = documentVerification.reason;
      result.valid = false;
      return result;
    }
  }

  result.valid = valid;
  result.reason = 'clear';
  return result;
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
 * Fallback deterministic way to hash a document that lacks document numbers
 *
 * @param  {Object} properties as returned from Onfido
 *
 * @return {String} keccak256 hash
 */
function hashFallback (properties) {
  const string = [
    'first_name',
    'last_name',
    'issuing_country',
    'document_type',
    'date_of_birth',
    'date_of_expiry',
    'gender'
  ]
    .map(prop => properties[prop])
    .join(',');

  return keccak256(string);
}

/**
 * Verify that the watchlist report is valid
 *
 * @param {Object} watchlistReport as sent from Onfido
 * @param {String} dob             date of birth from the document report: YYYY-MM-DD
 *
 * @return {Object}
 */
function verifyWatchlist (watchlistReport, dob) {
  if (!dob) {
    return { valid: false, reason: 'caution' };
  }

  const shortDob = dob.substr(0, 4);
  const { properties } = watchlistReport;
  const { records = [] } = properties;

  const valid = !records.find((record) => {
    const sources = record.sources;
    const recordDob = record.entity_fields_dob;

    // Ignore PEPs lists
    if (!sources.split(',').find((source) => !PEPS_PATTERN.test(source))) {
      return false;
    }

    // Filter out records with different date of birth
    return !recordDob || recordDob === dob || recordDob === shortDob;
  });

  if (!valid) {
    return { valid, reason: 'blocked-watchlist' };
  }

  return { valid };
}

/**
 * Check that the document isn't from US and hasn't been used before
 *
 * @param {Object} documentReport as sent from Onfido
 *
 * @return {Object} string reason for rejection, or null if okay
 */
async function verifyDocument (documentReport) {
  if (documentReport.result !== 'clear') {
    const reason = documentReport.sub_result || documentReport.result;

    return { valid: false, reason };
  }

  const { properties } = documentReport;
  const countryCode = properties['nationality'] || properties['issuing_country'];

  if (countryCode && BLOCKED_COUNTRIES.has(countryCode.toUpperCase())) {
    return { valid: false, reason: 'blocked-country' };
  }

  const documentNumbers = properties['document_numbers'];
  const hash = documentNumbers
    ? hashDocumentNumbers(documentNumbers)
    : hashFallback(properties);

  // Allow sandbox documents to go through
  if (hash === SANDBOX_DOCUMENT_HASH) {
    return { valid: true, hash };
  }

  if (await store.hasDocumentBeenUsed(hash)) {
    return { valid: false, reason: 'used-document', hash };
  }

  await store.markDocumentAsUsed(hash);
  return { valid: true, hash };
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
  getDocuments,
  verify,
  verifyCheck,

  ONFIDO_TAG_REGEX
};
