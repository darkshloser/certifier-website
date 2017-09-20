// Copyright Parity Technologies (UK) Ltd., 2017.
// Released under the Apache 2/MIT licenses.

'use strict';

const Router = require('koa-router');

const { hex2big, big2hex } = require('../utils');

function get ({ connector, certifier, feeRegistrar }) {
  const router = new Router({
    prefix: '/api/accounts'
  });

  router.get('/:address/incoming-txs', async (ctx, next) => {
    const { address } = ctx.params;
    const balance = await connector.balance(address);

    const incomingTxAddr = new Set();

    // Only trace addresses if the balance is non-zero
    if (balance.gt(0)) {
      // TODO: set starting block to the creation block of the fee contract?
      const from = hex2big(connector.block.number).sub(10000);
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
    const [ balance, paid ] = await Promise.all([
      connector.balance(address),
      feeRegistrar.hasPaid(address)
    ]);

    ctx.body = {
      balance: '0x' + balance.toString(16),
      paid
    };
  });

  router.get('/:address/nonce', async (ctx, next) => {
    const { address } = ctx.params;

    const nonce = await connector.nextNonce(address);

    ctx.body = { nonce };
  });

  return router;
}

module.exports = get;
