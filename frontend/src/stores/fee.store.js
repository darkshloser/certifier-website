import BigNumber from 'bignumber.js';
import EthereumTx from 'ethereumjs-tx';
import { action, computed, observable } from 'mobx';
import { phraseToWallet } from '@parity/ethkey.js';
import { randomPhrase } from '@parity/wordlist';
import store from 'store';

import backend from '../backend';
import config from './config.store';
import appStore, { FEE_HOLDER_LS_KEY, PAYER_LS_KEY } from './app.store';
import blockStore from './block.store';
import { isValidAddress } from '../utils';

// Gas Limit of 200k gas
const FEE_REGISTRAR_GAS_LIMIT = new BigNumber('0x30d40');
// Signature of `pay(address)`
const FEE_REGISTRAR_PAY_SIGNATURE = '0x0c11dedd';

export const STEPS = {
  'waiting-payment': Symbol('waiting for payment'),
  'account-selection': Symbol('account selection'),
  'from-exchange': Symbol('from an exchange'),
  'from-personal': Symbol('from a personal wallet'),
  'sending-payment': Symbol('sending payment')
};

class FeeStore {
  fee = null;
  feeRegistrar = null;
  totalFee = null;

  @observable step;

  // The address of the actual fee-payer
  @observable payer;
  @observable incomingChoices;

  // The transaction hash for the Fee Registrar
  @observable transaction;

  // The throw-away wallet created on load that will
  // receive the fee
  @observable wallet;

  constructor () {
    appStore.register('fee', this.load);
    appStore.on('restart', this.init);
    appStore.on('external-payer', (address) => {
      this.setPayer(address);
    });

    this.init();
  }

  init = () => {
    this.step = STEPS['waiting-payment'];
    this.payer = '';
    this.incomingChoices = [];
    this.transaction = null;
    this.wallet = null;
  };

  load = async () => {
    const storedPayer = store.get(PAYER_LS_KEY);

    try {
      // A Payer has been stored in localStorage
      if (storedPayer) {
        this.setPayer(storedPayer);

        if (await this.checkPayer()) {
          return true;
        }

        // Otherwise, remove it from LS and continue
        this.setPayer('');
        store.remove(PAYER_LS_KEY);
      }

      // Retrieve the fee
      const { fee, feeRegistrar } = await backend.fee();

      this.fee = fee;
      this.feeRegistrar = feeRegistrar;
      this.totalFee = fee.plus(config.get('gasPrice').mul(FEE_REGISTRAR_GAS_LIMIT));

      // Get the throw-away wallet
      const wallet = await this.getWallet();

      this.setWallet(wallet);

      await this.checkWallet();
    } catch (error) {
      appStore.addError(error);
    }
  };

  async checkPayer () {
    try {
      const { payer } = this;
      const { origins } = await backend.getAccountFeeInfo(payer);
      const feeAddress = await this.getFeeAddress();
      const lcFeeAddress = feeAddress
        ? feeAddress.toLowerCase()
        : feeAddress;

      if (origins.find((address) => address.toLowerCase() === lcFeeAddress)) {
        store.set(PAYER_LS_KEY, payer);
        appStore.goto('certify');
        this.emptyWallet(payer);

        return true;
      }
    } catch (error) {
      appStore.addError(error);
    }

    return false;
  }

  async checkWallet () {
    const { address } = this.wallet;
    const { balance } = await backend.getAccountFeeInfo(address);

    if (balance.gte(this.totalFee)) {
      const { incomingTxs } = await backend.getAccountIncomingTxs(address);

      this.setIncomingChoices(incomingTxs);
      this.goto('account-selection');
    }

    this.setBalance(balance);
  }

  async emptyWallet (payer) {
    try {
      const hasWallet = !!(this.wallet || this.storedPhrase);

      if (!hasWallet) {
        return;
      }

      const wallet = this.wallet || await this.getWallet();

      if (wallet.address === payer) {
        console.warn('will not empty the account: the payer is the wallet holder');
        return;
      }

      const { balance } = await backend.getAccountFeeInfo(wallet.address);

      if (balance.eq(0)) {
        return;
      }

      // Gas Limit of 21000k for a standard TX
      const gasLimit = new BigNumber(21000);
      const value = balance.sub(gasLimit.mul(config.get('gasPrice')));

      if (value.lte(0)) {
        console.warn('could not empty account', wallet.address);
        return;
      }

      const nonce = await backend.nonce(wallet.address);
      const privateKey = Buffer.from(wallet.secret.slice(2), 'hex');
      const tx = new EthereumTx({
        to: payer,
        gasLimit: '0x' + gasLimit.toString(16),
        gasPrice: '0x' + config.get('gasPrice').toString(16),
        value: '0x' + value.toString(16),
        nonce
      });

      tx.sign(privateKey);

      const serializedTx = `0x${tx.serialize().toString('hex')}`;
      const { hash } = await backend.sendFeeTx(serializedTx);

      console.warn('sent emptying account tx', hash);
    } catch (error) {
      appStore.addError(error);
    }
  }

  async getFeeAddress () {
    if (!this.wallet) {
      this.wallet = await this.getWallet();
    }

    return this.wallet.address;
  }

  async getWallet () {
    const { storedPhrase } = this;
    const phrase = storedPhrase || randomPhrase(12);

    if (!storedPhrase) {
      store.set(FEE_HOLDER_LS_KEY, phrase);
    }

    const { address, secret } = await phraseToWallet(phrase);

    return { address, secret, phrase };
  }

  @action goto (step) {
    if (!STEPS[step]) {
      throw new Error(`unknown step ${step}`);
    }

    this.step = STEPS[step];
  }

  async sendPayment () {
    const { payer } = this;

    try {
      if (!isValidAddress(payer)) {
        throw new Error('invalid payer address: ' + payer);
      }

      this.goto('sending-payment');

      const { address, secret } = this.wallet;
      const privateKey = Buffer.from(secret.slice(2), 'hex');

      const nonce = await backend.nonce(address);
      const calldata = FEE_REGISTRAR_PAY_SIGNATURE + payer.slice(-40).padStart(64, 0);

      const tx = new EthereumTx({
        to: this.feeRegistrar,
        gasLimit: '0x' + FEE_REGISTRAR_GAS_LIMIT.toString(16),
        gasPrice: '0x' + config.get('gasPrice').toString(16),
        data: calldata,
        value: '0x' + this.fee.toString(16),
        nonce
      });

      tx.sign(privateKey);

      const serializedTx = `0x${tx.serialize().toString('hex')}`;
      const { hash } = await backend.sendFeeTx(serializedTx);

      console.warn('sent FeeRegistrar tx', hash);
      this.setTransaction(hash);
    } catch (error) {
      appStore.addError(error);
    }
  }

  @computed get requiredEth () {
    const { fee, wallet } = this;

    if (fee === null || wallet === null || !wallet.balance) {
      return null;
    }

    const value = this.totalFee;

    if (value.lte(wallet.balance)) {
      return new BigNumber(0);
    }

    return value.sub(wallet.balance);
  }

  get storedPhrase () {
    return store.get(FEE_HOLDER_LS_KEY);
  }

  @action setBalance (balance) {
    this.wallet = Object.assign({}, this.wallet, { balance });
  }

  @action setIncomingChoices (incomingChoices) {
    this.incomingChoices = incomingChoices;
  }

  @action setPayer (payer) {
    this.payer = payer;
  }

  @action setTransaction (transaction) {
    this.transaction = transaction;
  }

  @action setWallet ({ address, secret, phrase }) {
    this.wallet = { address, secret, phrase };
  }

  watchPayer () {
    this.unwatchPayer();
    blockStore.on('block', this.checkPayer, this);
  }

  watchWallet () {
    this.unwatchWallet();
    blockStore.on('block', this.checkWallet, this);
  }

  unwatchPayer () {
    blockStore.removeListener('block', this.checkPayer, this);
  }

  unwatchWallet () {
    blockStore.removeListener('block', this.checkWallet, this);
  }
}

export default new FeeStore();
