// Copyright Parity Technologies (UK) Ltd., 2017.
// Released under the Apache 2/MIT licenses.

'use strict';

const path = require('path');

process.env.NODE_CONFIG_DIR = path.resolve(__dirname, '../../../config');

const { uniq } = require('lodash');
const config = require('config');

const { CachingTransport } = require('../api/transport');
const Certifier = require('../contracts/certifier');
const Identity = require('../identity');
const Fee = require('../contracts/fee');
const ParityConnector = require('../api/parity');

const onfidoMaxChecks = config.get('onfido.maxChecks');

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

async function main () {
  const transport = new CachingTransport(config.get('nodeWs'));
  const connector = new ParityConnector(transport);
  const feeRegistrar = new Fee(connector, config.get('feeContract'), config.get('oldFeeContract'));

  const certifier = new Certifier(connector, config.get('certifierContract'));

  await fetch(feeRegistrar._oldContract);

  async function fetch (feeContractInstance) {
    const payments = await feeContractInstance.events.Paid().get({
      fromBlock: '4000000'
    });

    const payers = uniq(payments.map((log) => log.params.who));
    const uncertifiedPayers = [];

    for (const payer of payers) {
      const identity = new Identity(payer);
      const checks = await identity.checks.count();
      const certified = await certifier.isCertified(payer);
      const [ , paymentCount ] = await feeContractInstance.methods.payer(payer).get();
      const mustPay = paymentCount * onfidoMaxChecks <= checks;

      if (!certified && !mustPay) {
        uncertifiedPayers.push(payer);
      }
    }

    console.warn(`> received ${payments.length} payements`);
    console.warn(`> by ${payers.length} unique addresses`);
    console.warn(`> of which ${uncertifiedPayers.length} have not been certified yet`);
  }
}
