// Copyright Parity Technologies (UK) Ltd., 2017.
// Released under the Apache 2/MIT licenses.

'use strict';

const Router = require('koa-router');
const config = require('config');

const Identity = require('../identity');
const { rateLimiter } = require('./utils');
const { hex2big, big2hex } = require('../utils');

const onfidoMaxChecks = config.get('onfido.maxChecks');

function get ({ connector, certifier, feeRegistrar }) {
  const router = new Router({
    prefix: '/api/accounts'
  });

  router.get('/:address/incoming-txs', async (ctx, next) => {
    const { address } = ctx.params;

    await rateLimiter(address, ctx.remoteAddress);

    const balance = await connector.balance(address);

    const incomingTxAddr = new Set();

    // Only trace addresses if the balance is non-zero
    if (balance.gt(0)) {
      const from = hex2big(connector.block.number).sub(5000); // approx 24h
      const trace = await connector.trace({ fromBlock: big2hex(from), toAddress: [address] });

      for (const { action } of trace) {
        incomingTxAddr.add(action.from);
      }
    }

    ctx.body = {
      incomingTxs: Array.from(incomingTxAddr)
    };
  });

  router.get('/:address/fee', async (ctx, next) => {
    const { address } = ctx.params;

    await rateLimiter(address, ctx.remoteAddress);

    const identity = new Identity(address);

    const balance = await connector.balance(address);
    const checkCount = await identity.checks.count();
    const { paymentCount } = await feeRegistrar.paymentStatus(address);
    const certified = await certifier.isCertified(address);

    // If certified, means that the Address paid
    const paid = certified || (onfidoMaxChecks * paymentCount) > checkCount;

    ctx.body = {
      balance: '0x' + balance.toString(16),
      paid
    };
  });

  router.get('/:address/nonce', async (ctx, next) => {
    const { address } = ctx.params;

    await rateLimiter(address, ctx.remoteAddress);

    const nonce = await connector.nextNonce(address);

    ctx.body = { nonce };
  });

  return router;
}

module.exports = get;
