// Copyright Parity Technologies (UK) Ltd., 2017.
// Released under the Apache 2/MIT licenses.

'use strict';

const EthereumTx = require('ethereumjs-tx');
const Router = require('koa-router');

const { buf2hex, buf2big, int2hex } = require('../utils');
const { error, rateLimiter } = require('./utils');

async function get ({ connector, certifier, certifierHandler, feeRegistrar }) {
  const router = new Router({
    prefix: '/api'
  });

  router.get('/block/hash', (ctx) => {
    if (!connector.block) {
      return error(ctx, 500, 'Could not fetch latest block');
    }

    ctx.body = { hash: connector.block.hash };
  });

  router.get('/fee', async (ctx, next) => {
    const address = feeRegistrar.address;
    const fee = await feeRegistrar.fee();

    ctx.body = { fee: '0x' + fee.toString(16), feeRegistrar: address };
  });

  router.get('/certifier', async (ctx, next) => {
    const { address } = certifier;

    ctx.body = { certifier: address };
  });

  router.get('/recertifier', async (ctx, next) => {
    const { address } = certifierHandler;
    const fee = certifierHandler.values.fee;

    ctx.body = { address, fee: int2hex(fee) };
  });

  const txHandler = async (ctx, next) => {
    const { tx } = ctx.request.body;

    const txBuf = Buffer.from(tx.substring(2), 'hex');
    const txObj = new EthereumTx(txBuf);

    const from = buf2hex(txObj.from);

    await rateLimiter(from, ctx.remoteAddress);

    const to = buf2hex(txObj.to);
    const toHasPaid = await feeRegistrar.hasPaid(to);

    // A transaction is valid if the recipient is a fee-payer,
    // or if it's a transaction to the Fee Registrar
    if (to.toLowerCase() !== feeRegistrar.address && !toHasPaid) {
      // return error(ctx, 400, 'Invalid `to` field');
    }

    const value = buf2big(txObj.value);
    const gasPrice = buf2big(txObj.gasPrice);
    const gasLimit = buf2big(txObj.gasLimit);

    const requiredEth = value.add(gasPrice.mul(gasLimit));
    const balance = await connector.balance(from);

    if (balance.cmp(requiredEth) < 0) {
      return error(ctx, 400, 'Insufficient funds');
    }

    const hash = await connector.sendTx(tx);

    ctx.body = { hash };
  };

  router.post('/fee-tx', txHandler);
  router.post('/tx', txHandler);

  return router;
}

module.exports = get;
