// Copyright Parity Technologies (UK) Ltd., 2017.
// Released under the Apache 2/MIT licenses.

'use strict';

const redis = require('../redis');

// No more than 20 addresses per IP
const RATE_LIMITED_ADDRESSES = 20;

function error (ctx, code = 400, body = 'Invalid request') {
  ctx.status = code;
  ctx.body = body;
}

function getIp () {

}

async function rateLimiter (address, ip) {
  const key = `picops::rate-limiter::${ip}`;
  const json = await redis.get(key);
  const addresses = json
    ? JSON.parse(json)
    : [];

  // Address is already there, everything is OK
  if (addresses.includes(address)) {
    return;
  }

  if (addresses.length >= RATE_LIMITED_ADDRESSES) {
    throw new Error('you exceeded the number of addresses your IP can use');
  }

  addresses.push(address);
  await redis.set(key, JSON.stringify(addresses));
}

module.exports = {
  error,
  getIp,
  rateLimiter
};
