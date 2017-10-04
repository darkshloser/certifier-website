// Copyright Parity Technologies (UK) Ltd., 2017.
// Released under the Apache 2/MIT licenses.

'use strict';

const Router = require('koa-router');
const config = require('config');

function get () {
  const router = new Router({
    prefix: '/api'
  });

  router.get('/config', async (ctx, next) => {
    const gasPrice = config.get('gasPrice');

    ctx.body = {
      gasPrice
    };
  });

  return router;
}

module.exports = get;
