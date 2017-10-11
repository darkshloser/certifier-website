// Copyright Parity Technologies (UK) Ltd., 2017.
// Released under the Apache 2/MIT licenses.

'use strict';

const config = require('config');
const fs = require('fs');
const path = require('path');
const Wallet = require('ethereumjs-wallet');

const { filename, password } = config.get('account');
const keyFile = fs.readFileSync(path.resolve(__dirname, `../../keys/${filename}`));
const keyObject = JSON.parse(keyFile.toString());

const wallet = Wallet.fromV3(keyObject, password);
const account = {
  address: '0x' + wallet.getAddress().toString('hex'),
  publicKey: wallet.getPublicKey(),
  privateKey: wallet.getPrivateKey()
};

module.exports = account;
