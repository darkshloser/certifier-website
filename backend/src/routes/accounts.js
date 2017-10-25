// Copyright Parity Technologies (UK) Ltd., 2017.
// Released under the Apache 2/MIT licenses.

'use strict';

const config = require('config');
const EthJS = require('ethereumjs-util');
const Router = require('koa-router');

const store = require('../store');
const Identity = require('../identity');
const { error: errorHandler, rateLimiter } = require('./utils');
const { buf2add, hex2big, big2hex, int2hex, isValidAddress } = require('../utils');

const onfidoMaxChecks = config.get('onfido.maxChecks');

function get ({ connector, certifier, certifierHandler, feeRegistrar }) {
  const router = new Router({
    prefix: '/api/accounts'
  });

  router.get('/:address/balance', async (ctx, next) => {
    const { address } = ctx.params;

    if (!isValidAddress(address)) {
      return errorHandler(ctx, 400, 'Invalid address');
    }

    await rateLimiter(address, ctx.remoteAddress);

    const balance = await connector.balance(address);

    ctx.body = { balance: int2hex(balance) };
  });

  router.get('/:address/certification-locked', async (ctx, next) => {
    const { address } = ctx.params;

    if (!isValidAddress(address)) {
      return errorHandler(ctx, 400, 'Invalid address');
    }

    await rateLimiter(address, ctx.remoteAddress);

    const [ locked ] = await certifierHandler.methods.locked(address).get();

    ctx.body = { locked };
  });

  router.get('/:address/recertification', async (ctx, next) => {
    const { address } = ctx.params;

    if (!isValidAddress(address)) {
      return errorHandler(ctx, 400, 'Invalid address');
    }

    await rateLimiter(address, ctx.remoteAddress);

    const data = await store.getPendingRecertification(address) || { status: 'unkown' };

    // If success or error, send the data and delete it from Redis
    if (data.status !== 'pending') {
      store.removePendingRecertification(address);
    }

    ctx.body = data;
  });

  router.get('/:address/incoming-txs', async (ctx, next) => {
    const { address } = ctx.params;

    if (!isValidAddress(address)) {
      return errorHandler(ctx, 400, 'Invalid address');
    }

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

    if (!isValidAddress(address)) {
      return errorHandler(ctx, 400, 'Invalid address');
    }

    await rateLimiter(address, ctx.remoteAddress);

    const identity = new Identity(address);

    const [
      balance,
      checkCount,
      { paymentCount, paymentOrigins },
      certified
    ] = await Promise.all([
      connector.balance(address),
      identity.checks.count(),
      feeRegistrar.paymentStatus(address),
      certifier.isCertified(address)
    ]);

    // If certified, means that the Address paid
    const paid = certified || (onfidoMaxChecks * paymentCount) > checkCount;
    const origins = paid ? paymentOrigins : [];

    ctx.body = {
      balance: '0x' + balance.toString(16),
      paid,
      origins
    };
  });

  router.get('/:address/nonce', async (ctx, next) => {
    const { address } = ctx.params;

    if (!isValidAddress(address)) {
      return errorHandler(ctx, 400, 'Invalid address');
    }

    await rateLimiter(address, ctx.remoteAddress);

    const nonce = await connector.nextNonce(address);

    ctx.body = { nonce };
  });

  router.get('/:address/refund/:origin', async (ctx, next) => {
    const { address, origin } = ctx.params;

    if (!isValidAddress(address)) {
      return errorHandler(ctx, 400, 'Invalid address');
    }

    if (!origin || !isValidAddress(origin)) {
      return errorHandler(ctx, 400, 'Invalid origin');
    }

    await rateLimiter(address, ctx.remoteAddress);

    const lcWho = address.toLowerCase();
    const lcOrigin = origin.toLowerCase();

    const data = await store.getRefundData({ who: lcWho, origin: lcOrigin });

    if (!data) {
      ctx.body = { status: 'unkown' };
      return;
    }

    ctx.body = data;
  });

  router.post('/:address/refund', async (ctx, next) => {
    const { address: _address } = ctx.params;
    const address = _address.toLowerCase();

    if (!isValidAddress(address)) {
      return errorHandler(ctx, 400, 'Missing address');
    }

    await rateLimiter(address, ctx.remoteAddress);

    const { message, signature } = ctx.request.body;

    if (!message) {
      return errorHandler(ctx, 400, 'Missing message');
    }

    if (!signature) {
      return errorHandler(ctx, 400, 'Missing signature');
    }

    const identity = new Identity(address);
    const checkCount = await identity.checks.count();
    const { paymentCount, paymentOrigins: _pOrigins } = await feeRegistrar.paymentStatus(address, { version: 1 });
    const paymentOrigins = _pOrigins.map((a) => a.toLowerCase());

    if (paymentCount === 0) {
      return errorHandler(ctx, 400, 'No payment have been recorded for this address');
    }

    if (checkCount > (paymentCount - 1) * onfidoMaxChecks) {
      return errorHandler(ctx, 400, `${checkCount} checks have already been issued, for ${paymentCount} payment.`);
    }

    const msgHash = EthJS.hashPersonalMessage(EthJS.toBuffer(message));
    const { v, r, s } = EthJS.fromRpcSig(signature);
    const signPubKey = EthJS.ecrecover(msgHash, v, r, s);
    const signAddress = buf2add(EthJS.pubToAddress(signPubKey)).toLowerCase();

    if (!signAddress || !paymentOrigins.includes(signAddress)) {
      return errorHandler(ctx, 400, 'Payer not found in payment origins.');
    }

    const refund = { who: address, origin: signAddress };

    if (await store.isRefunding(refund)) {
      return errorHandler(ctx, 400, 'Already refunding this address. Please be patient.');
    }

    const refundData = await store.getRefundData(refund);

    // If transaction has been sent for the same refund, check if it has been mined
    if (refundData && refundData.transaction) {
      const { transaction } = refundData;
      const txReceipt = await connector.getTx(transaction);

      if (!txReceipt.blockNumber) {
        return errorHandler(ctx, 400, 'Already refunding this address. Please be patient.');
      }
    }

    await store.setRefundData(refund, { status: 'created' });
    await store.addRefund(refund);
    ctx.body = { status: 'created' };
  });

  return router;
}

module.exports = get;
