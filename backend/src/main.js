// Copyright Parity Technologies (UK) Ltd., 2017.
// Released under the Apache 2/MIT licenses.

'use strict';

const config = require('config');
const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const etag = require('koa-etag');
const cors = require('kcors');

const Certifier = require('./contracts/certifier');
const ParityConnector = require('./api/parity');
const Routes = require('./routes');
const Fee = require('./contracts/fee');

const app = new Koa();
const { port, hostname } = config.get('http');

main();

async function main () {
  const connector = new ParityConnector(config.get('nodeWs'));
  const feeRegistrar = new Fee(connector, config.get('feeContract'));

  const certifier = new Certifier(connector, config.get('certifierContract'));

  app.use(async (ctx, next) => {
    ctx.ip = ctx.req.headers['x-forwarded-for'] || ctx.req.connection.remoteAddress;

    try {
      await next();
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = err.message;
      ctx.app.emit('error', err, ctx);
    }
  });

  app
    .use(bodyParser())
    .use(cors())
    .use(etag());

  Routes(app, { connector, certifier, feeRegistrar });

  app.listen(port, hostname);
}
