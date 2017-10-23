// Copyright Parity Technologies (UK) Ltd., 2017.
// Released under the Apache 2/MIT licenses.

'use strict';

const Accounts = require('./accounts');
const Config = require('./config');
const Chain = require('./chain');
const Onfido = require('./onfido');

module.exports = async function set (app, { connector, certifier, certifierHandler, feeRegistrar }) {
  for (const Route of [
    Accounts,
    Config,
    Chain,
    Onfido
  ]) {
    const instance = await Route({ connector, certifier, certifierHandler, feeRegistrar });

    app.use(instance.routes(), instance.allowedMethods());
  }
};
