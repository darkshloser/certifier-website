// Copyright Parity Technologies (UK) Ltd., 2017.
// Released under the Apache 2/MIT licenses.

'use strict';

const Router = require('koa-router');

const Onfido = require('../onfido');
const store = require('../store');
const { error } = require('./utils');

const { ONFIDO_STATUS } = Onfido;

function get ({ certifier, feeRegistrar }) {
  const router = new Router({
    prefix: '/api/onfido'
  });

  router.post('/webhook', async (ctx, next) => {
    const { payload } = ctx.request.body;

    if (!payload) {
      return error(ctx);
    }

    const { resource_type: type, action, object } = payload;

    if (!type || !action || !object || !object.href) {
      return error(ctx);
    }

    if (action === 'check.completed') {
      console.warn('[WEBHOOK] Check completed', object.href);
      await store.Onfido.push(object.href);
    }

    ctx.body = 'OK';
  });

  /**
   * Get the current status of Onfido certification
   * for the given address.
   *
   * The status can be unkown, created, pending or completed.
   * The result is set if the status is completed, whether to
   * success or fail.
   */
  router.get('/:address', async (ctx, next) => {
    const { address } = ctx.params;
    const stored = await store.Onfido.get(address) || {};
    const certified = await certifier.isCertified(address);

    const { result, status = ONFIDO_STATUS.UNKOWN, reason = 'unknown', error = '' } = stored;

    ctx.body = { certified, status, result, reason, error };
  });

  router.post('/:address/applicant', async (ctx, next) => {
    const { address } = ctx.params;
    const { firstName, lastName } = ctx.request.body;

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

    const stored = await store.Onfido.get(address);
    let sdkToken = null;
    let applicantId = null;

    // Create a new applicant if none stored
    if (!stored || !stored.applicantId) {
      const result = await Onfido.createApplicant({ firstName, lastName });

      sdkToken = result.sdkToken;
      applicantId = result.applicantId;

    // Otherwise, update the existing applicant
    } else {
      applicantId = stored.applicantId;

      const result = await Onfido.updateApplicant(applicantId, { firstName, lastName });

      sdkToken = result.sdkToken;
    }

    // Store the applicant id in Redis
    await store.Onfido.set(address, { status: ONFIDO_STATUS.CREATED, applicantId });

    ctx.body = { sdkToken };
  });

  router.post('/:address/check', async (ctx, next) => {
    const { address } = ctx.params;
    const stored = await store.Onfido.get(address);
    const certified = await certifier.isCertified(address);

    if (certified) {
      return error(ctx, 400, 'Already certified');
    }

    if (!stored || stored.status !== ONFIDO_STATUS.CREATED || !stored.applicantId) {
      return error(ctx, 400, 'No application has been created for this address');
    }

    const { applicantId } = stored;
    const checks = await Onfido.getChecks(applicantId);

    if (checks.length >= 3) {
      return error(ctx, 400, 'Only 3 checks are allowed per single fee payment');
    }

    const { checkId } = await Onfido.createCheck(applicantId, address);

    // Store the applicant id in Redis
    await store.Onfido.set(address, { status: ONFIDO_STATUS.PENDING, applicantId, checkId });

    ctx.body = { result: 'ok' };
  });

  return router;
}

module.exports = get;
