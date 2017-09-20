// Copyright Parity Technologies (UK) Ltd., 2017.
// Released under the Apache 2/MIT licenses.

'use strict';

const redis = require('../redis');

function error (ctx, code = 400, body = 'Invalid request') {
  ctx.status = code;
  ctx.body = body;
}

function getIp () {

}

function rateLimiter (address, ip) {
  const exceeded = false;

  if (exceeded) {
    throw new Error('you exceeded the number of requests your IP can make');
  }
}

module.exports = {
  error,
  getIp,
  rateLimiter
};
