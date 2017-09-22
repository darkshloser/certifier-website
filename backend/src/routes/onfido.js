// Copyright Parity Technologies (UK) Ltd., 2017.
// Released under the Apache 2/MIT licenses.

'use strict';

const EthJS = require('ethereumjs-util');
const Router = require('koa-router');
const crypto = require('crypto');
const config = require('config');

const Identity = require('../identity');
const Onfido = require('../onfido');
const store = require('../store');
const { error, rateLimiter } = require('./utils');
const { buf2add } = require('../utils');

function get ({ certifier, feeRegistrar }) {
  const webhookToken = config.get('onfido.webhookToken');

  const router = new Router({
    prefix: '/api/onfido'
  });

  router.post('/webhook', async (ctx, next) => {
    const { payload } = ctx.request.body;
    const signature = ctx.request.headers['x-signature'];

    const hmac = crypto.createHmac('sha1', webhookToken);

    hmac.update(ctx.request.rawBody);

    if (!payload || signature !== hmac.digest('hex')) {
      return error(ctx);
    }

    const { resource_type: type, action, object } = payload;

    if (!type || !action || !object || !object.href) {
      return error(ctx);
    }

    if (action === 'check.completed') {
      console.warn('[WEBHOOK] Check completed', object.href);
      await store.push(object.href);
    }

    ctx.body = 'OK';
  });

  /**
   * Get the current status of Onfido certification
   * for the given address.
   *
   * The status can be unknown, created, pending or completed.
   * The result is set if the status is completed, whether to
   * success or fail.
   */
  router.get('/:address', async (ctx, next) => {
    const { address } = ctx.params;

    await rateLimiter(address, ctx.remoteAddress);

    const identity = new Identity(address);

    const { result, status, reason, error } = await identity.getData();
    const certified = await certifier.isCertified(address);

    ctx.body = { certified, status, result, reason, error };
  });

  router.post('/:address/applicant', async (ctx, next) => {
    const { address } = ctx.params;

    await rateLimiter(address, ctx.remoteAddress);

    const { firstName, lastName, signature, message } = ctx.request.body;

    if (!firstName || !lastName || firstName.length < 2 || lastName.length < 2) {
      return error(ctx, 400, 'First name and last name should be at least 2 characters long');
    }

    if (!signature) {
      return error(ctx, 400, 'Missing signature');
    }

    if (!message) {
      return error(ctx, 400, 'Missing signature\'s message');
    }

    const [certified, paid] = await Promise.all([
      certifier.isCertified(address),
      feeRegistrar.hasPaid(address)
    ]);

    if (certified) {
      return error(ctx, 400, 'Already certified');
    }

    if (!paid) {
      return error(ctx, 400, 'Missing fee payment');
    }

    const msgHash = EthJS.hashPersonalMessage(EthJS.toBuffer(message));
    const { v, r, s } = EthJS.fromRpcSig(signature);
    const signPubKey = EthJS.ecrecover(msgHash, v, r, s);
    const signAddress = buf2add(EthJS.pubToAddress(signPubKey));

    const { paymentCount, paymentOrigins } = await feeRegistrar.paymentStatus(address);

    if (!paymentOrigins.includes(signAddress)) {
      console.error('signature / payment origin mismatch', { paymentOrigins, signAddress });
      return error(ctx, 400, 'Signature / payment origin mismatch');
    }

    const identity = new Identity(address);

    if (await identity.checks.count() >= paymentCount * 3) {
      return error(ctx, 400, 'Only 3 checks are allowed per single fee payment');
    }

    const { sdkToken, applicantId } = await Onfido.createApplicant({ firstName, lastName });

    // Store the applicant id in Redis
    await store.addApplicant(applicantId);
    await identity.applicants.store({ id: applicantId, status: Identity.STATUS.CREATED });

    ctx.body = { sdkToken };
  });

  router.post('/:address/check', async (ctx, next) => {
    const { address } = ctx.params;

    await rateLimiter(address, ctx.remoteAddress);

    const certified = await certifier.isCertified(address);

    if (certified) {
      return error(ctx, 400, 'Already certified');
    }

    const identity = new Identity(address);
    const applicants = await identity.applicants.getAll();
    const applicant = applicants.find((app) => app.status === Identity.STATUS.CREATED);

    if (!applicant) {
      return error(ctx, 400, 'No application has been created for this address');
    }

    const checks = await Onfido.getChecks(applicant.id);

    if (checks.length > 0) {
      return error(ctx, 400, 'Cannot create any more checks for this applicant');
    }

    const { checkId } = await Onfido.createCheck(applicant.id, address);

    console.warn(`> created check ${checkId} for ${applicant.id}`);

    // Store the applicant id in Redis
    applicant.checkId = checkId;
    applicant.status = Identity.STATUS.PENDING;

    await identity.applicants.store(applicant);
    await identity.checks.store({ id: checkId, status: Identity.STATUS.PENDING });

    ctx.body = { result: 'ok' };
  });

  return router;
}

module.exports = get;
