// Copyright Parity Technologies (UK) Ltd., 2017.
// Released under the Apache 2/MIT licenses.

'use strict';

const Accounts = require('./accounts');
const Chain = require('./chain');
const Onfido = require('./onfido');

module.exports = function set (app, { connector, certifier, feeRegistrar }) {
  [
    Accounts,
    Chain,
    Onfido
  ].forEach((Route) => {
    const instance = Route({ connector, certifier, feeRegistrar });

    app.use(instance.routes(), instance.allowedMethods());
  });
};
