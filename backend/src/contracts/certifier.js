// Copyright Parity Technologies (UK) Ltd., 2017.
// Released under the Apache 2/MIT licenses.

'use strict';

const config = require('config');
const fs = require('fs');
const path = require('path');
const EthereumTx = require('ethereumjs-tx');
const Wallet = require('ethereumjs-wallet');

const { MultiCertifier } = require('../abis');
const Contract = require('../api/contract');

const gasPrice = config.get('gasPrice');
const { filename, password } = config.get('account');
const keyFile = fs.readFileSync(path.resolve(__dirname, `../../keys/${filename}`));
const keyObject = JSON.parse(keyFile.toString());

const wallet = Wallet.fromV3(keyObject, password);
const account = {
  address: '0x' + wallet.getAddress().toString('hex'),
  publicKey: wallet.getPublicKey(),
  privateKey: wallet.getPrivateKey()
};

class Certifier extends Contract {
  /**
   * Abstraction over the certifier contract, found here:
   * https://github.com/paritytech/second-price-auction/blob/master/src/contracts/MultiCertifier.sol
   *
   * @param {Object} connector  A ParityConnector
   * @param {String} address    `0x` prefixed
   */
  constructor (connector, address) {
    super(connector, address, MultiCertifier);
  }

  /**
   * Certify an address using a trusted account
   *
   * @param {String} address to certify, `0x` prefixed
   *
   * @return {Promise<String>} promise of a TX hash
   */
  async certify (address) {
    const { connector } = this;
    const data = this.methods.certify(address).data;
    const options = {
      from: account.address,
      to: this.address,
      value: '0x0',
      gasPrice,
      data
    };

    const gasLimit = await connector.estimateGas(options);
    const nonce = await connector.nextNonce(options.from);

    options.gasLimit = gasLimit;
    options.nonce = nonce;

    const tx = new EthereumTx(options);

    tx.sign(account.privateKey);

    const serializedTx = `0x${tx.serialize().toString('hex')}`;

    const txHash = await connector.sendTx(serializedTx);

    console.log(`sent certify tx for ${address} : ${txHash} `);

    return txHash;
  }

  /**
   * Check if account is certified
   *
   * @param {String}  address `0x` prefixed
   *
   * @return {Promise<Boolean>}
   */
  async isCertified (address) {
    const [ certified ] = await this.methods.certified(address).get();

    return certified;
  }
}

module.exports = Certifier;
