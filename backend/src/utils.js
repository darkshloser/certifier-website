// Copyright Parity Technologies (UK) Ltd., 2017.
// Released under the Apache 2/MIT licenses.

'use strict';

const keccak = require('keccak');
const BigNumber = require('bignumber.js');

function validateHex (hex) {
  if (typeof hex !== 'string' || hex.substring(0, 2) !== '0x') {
    throw new Error('hex must be a `0x` prefixed string');
  }
}

function int2date (int) {
  return new Date(int * 1000);
}

function hex2date (hex) {
  return int2date(hex2int(hex));
}

function hex2bool (hex) {
  validateHex(hex);

  return hex.slice(-1) === '1';
}

function hex2int (hex) {
  validateHex(hex);

  return parseInt(hex.substring(2), 16);
}

function int2hex (int) {
  return `0x${int.toString(16)}`;
}

function hex2buf (hex) {
  validateHex(hex);

  return Buffer.from(hex.substring(2), 'hex');
}

function buf2add (value) {
  const hex = '0x' + value.toString('hex').padStart(40, 0);

  return toChecksumAddress(hex);
}

function buf2hex (buf) {
  return `0x${buf.toString('hex') || 0}`;
}

function hex2big (hex) {
  validateHex(hex);

  return new BigNumber(hex);
}

function buf2big (buf) {
  return hex2big(buf2hex(buf));
}

// The interface is the same
const big2hex = int2hex;

function pause (time) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, time);
  });
}

function isValidAddress (value) {
  return value && value.length === 42 && /^0x[0-9a-f]{40}$/i.test(value);
}

function ejs2val (value, type) {
  if (Array.isArray(value)) {
    const subtype = /^(.+)\[.*\]$/.exec(type)[1];

    return value.map((val) => ejs2val(val, subtype));
  }

  if (/(int|fixed)/.test(type)) {
    return new BigNumber('0x' + value.toString('hex'));
  }

  if (/bytes/.test(type)) {
    return '0x' + value.toString('hex');
  }

  if (/address/.test(type)) {
    return buf2add(value);
  }

  return value;
}

function keccak256 (data) {
  return keccak('keccak256')
    .update(Buffer.from(data))
    .digest('hex');
}

async function sleep (duration) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, duration);
  });
}

function toChecksumAddress (_address) {
  const address = (_address || '').toLowerCase();

  if (address.length !== 42) {
    throw new Error('address must be 20 bytes long');
  }

  const hash = '0x' + keccak256(address.slice(-40));
  let result = '0x';

  for (let n = 0; n < 40; n++) {
    result += parseInt(hash[n], 16) > 7
      ? address[n + 2].toUpperCase()
      : address[n + 2];
  }

  return result;
}

async function waitForConfirmations (connector, tx) {
  let attempts = 0;

  // Wait for the transaction to be mined
  await connector.transactionReceipt(tx);

  console.warn('waiting for 12 confirmations for ' + tx);

  return new Promise((resolve, reject) => {
    // Clean-up and reject after 10 minutes
    const timeoutId = setTimeout(() => {
      clean();
      reject(new Error('transaction took too long to be confirmed'));
    }, 10 * 60 * 1000);

    const clean = () => {
      clearTimeout(timeoutId);
      connector.removeListener('block', check);
    };

    const check = (block) => {
      connector.transport
        .request('eth_getTransactionReceipt', tx)
        .then((receipt) => {
          if (!receipt || !receipt.blockNumber) {
            return;
          }

          const height = hex2big(block.number).minus(hex2big(receipt.blockNumber));

          // Resolve after 12 confirmations
          if (height.gte(12)) {
            clean();
            resolve();
          }
        })
        .catch((error) => {
          if (attempts >= 10) {
            clean();
            reject(error);
          } else {
            console.error(error);
          }
        });
    };

    connector.on('block', check);
  });
}

module.exports = {
  buf2add,
  big2hex,
  buf2big,
  buf2hex,
  ejs2val,
  hex2bool,
  hex2date,
  hex2int,
  hex2big,
  hex2buf,
  int2date,
  int2hex,
  isValidAddress,
  pause,
  keccak256,
  sleep,
  toChecksumAddress,
  waitForConfirmations
};
