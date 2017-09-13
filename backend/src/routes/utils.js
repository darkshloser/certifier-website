// Copyright Parity Technologies (UK) Ltd., 2017.
// Released under the Apache 2/MIT licenses.

'use strict';

function error (ctx, code = 400, body = 'Invalid request') {
  ctx.status = code;
  ctx.body = body;
}

module.exports = {
  error
};
