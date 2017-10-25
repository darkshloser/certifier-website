import { phraseToWallet } from '@parity/ethkey.js';
import { countries } from 'country-data';
import EventEmitter from 'eventemitter3';
import queryString from 'query-string';
import { iframeResizerContentWindow } from 'iframe-resizer';
import { action, observable } from 'mobx';
import store from 'store';

import backend from '../backend';
import config from './config.store';
import { parentMessage } from '../utils';

export const CITIZENSHIP_LS_KEY = '_parity-certifier::citizenship';
export const FEE_HOLDER_LS_KEY = '_parity-certifier::fee-holder';
export const OLD_FEE_HOLDER_LS_KEY = '_parity-certifier::old-fee-holder';
export const PAYER_LS_KEY = '_parity-certifier::payer';
export const TERMS_LS_KEY = '_parity-certifier::agreed-terms::v1';

export const STEPS = {
  'start': Symbol('start'),
  'terms': Symbol('terms'),
  'country-selection': Symbol('country selection'),
  'fee': Symbol('fee'),
  'certify': Symbol('certify'),
  'certified': Symbol('certified')
};

let nextErrorId = 1;

class AppStore extends EventEmitter {
  blacklistedCountries = [];
  certifierAddress = null;
  exludedCountries = [];
  loaders = {};
  padding = true;
  showStepper = true;
  showFinalScreen = true;

  skipCountrySelection = false;
  skipStart = false;
  skipTerms = false;
  showAbi = true;

  queryCommands = {
    'blacklist': (countryCodes) => {
      this.exludedCountries = countryCodes;
    },
    'no-padding': () => {
      this.padding = false;
      this.showAbi = false;

      // Call the iframe resizer method so
      // parent embedding PICOPS can set
      // the iframe height automatically
      return console.warn(iframeResizerContentWindow ? 'got iframe resizer window' : '');
    },
    'extraneous': () => {
      this.showAbi = false;
    },
    'no-stepper': () => {
      this.showStepper = false;
    },
    'no-final-screen': () => {
      this.showFinalScreen = false;
    },
    'terms-accepted': () => {
      this.skipTerms = true;
      this.termsAccepted = true;
    },
    'paid-for': (address) => {
      this.once('load', () => {
        this.emit('external-payer', address.toLowerCase());
        this.goto('certify');
      });
    }
  }

  @observable citizenship = null;
  @observable loading = true;
  @observable messages = {};
  @observable termsAccepted = false;
  @observable step;
  @observable stepper = -1;

  constructor () {
    super();

    const parsed = queryString.parse(window.location.search, {
      arrayFormat: 'bracket'
    });

    Object.keys(parsed).forEach((key) => {
      if (this.queryCommands[key]) {
        this.queryCommands[key](parsed[key]);
      }
    });

    const bg = this.padding
      ? '#f1f1f1'
      : 'transparent';

    document.querySelector('body').style.backgroundColor = bg;
    document.querySelector('html').style.backgroundColor = bg;

    this.load();
  }

  load = () => {
    this._load()
      .catch((error) => this.addError(error));
  }

  _load = async () => {
    await config.load();

    this.certifierAddress = await backend.certifierAddress();

    if (store.get(TERMS_LS_KEY) === true) {
      this.skipTerms = true;
    }

    await this.loadCountries();

    if (this.skipTerms && this.skipCountrySelection) {
      this.skipStart = true;
    }

    this.goto('start');
    this.emit('load');
  };

  async setCertified (address) {
    parentMessage({
      action: 'certified',
      address
    });

    await this.goto('certified');
  }

  async getAccounts () {
    const currentPhrase = store.get(FEE_HOLDER_LS_KEY, '');
    const phrases = [ currentPhrase ]
      .concat(store.get(OLD_FEE_HOLDER_LS_KEY, []))
      .filter((phrase) => phrase);

    const accounts = [];

    for (const phrase of phrases) {
      const current = phrase === currentPhrase;

      try {
        const { address, secret } = await phraseToWallet(phrase);

        accounts.push({ address, secret, phrase, current });
      } catch (error) {
        console.error(error);
      }
    }

    return accounts;
  }

  async deleteAccount (phrase) {
    const nextPhrases = store.get(OLD_FEE_HOLDER_LS_KEY, [])
      .filter((ph) => ph && ph !== phrase);

    if (nextPhrases.length === 0) {
      store.remove(OLD_FEE_HOLDER_LS_KEY);
    } else {
      store.set(OLD_FEE_HOLDER_LS_KEY, nextPhrases);
    }
  }

  async goto (name) {
    if (!this.showFinalScreen && name === 'certified') {
      return;
    }

    if (!STEPS[name]) {
      throw new Error(`unknown step ${name}`);
    }

    if (name === 'start' && this.skipStart) {
      return this.goto('terms');
    }

    if (name === 'terms' && this.skipTerms) {
      return this.goto('country-selection');
    }

    if (name === 'country-selection' && this.skipCountrySelection) {
      return this.goto('fee');
    }

    this.setLoading(true);
    this.setStep(STEPS[name]);

    // Trigger the loaders and wait for them to return
    if (this.loaders[name]) {
      for (let loader of this.loaders[name]) {
        // A loader can return a truthy value to
        // skip further loadings
        const skip = await loader();

        if (skip) {
          return;
        }
      }
    }

    this.setLoading(false);
  }

  async fetchBlacklistedCountries () {
    return Promise.resolve([ 'USA' ]);
  }

  async loadCountries () {
    const blCountries = await this.fetchBlacklistedCountries();

    this.blacklistedCountries = blCountries
      .filter((countryKey) => {
        if (!countries[countryKey]) {
          console.error(new Error('unknown country key: ' + countryKey));
          return false;
        }

        return true;
      });

    const citizenship = store.get(CITIZENSHIP_LS_KEY) || null;

    // Skip country selection if valid citizenship stored
    if (countries[citizenship]) {
      this.skipCountrySelection = !!citizenship;
      this.citizenship = citizenship;
    }
  }

  register (step, loader) {
    if (!STEPS[step]) {
      throw new Error(`unknown step ${step}`);
    }

    this.loaders[step] = (this.loaders[step] || []).concat(loader);
  }

  restart () {
    const currentFeeHolder = store.get(FEE_HOLDER_LS_KEY);

    if (currentFeeHolder) {
      const prevFeeHolders = store.get(OLD_FEE_HOLDER_LS_KEY) || [];

      prevFeeHolders.push(currentFeeHolder);
      store.set(OLD_FEE_HOLDER_LS_KEY, prevFeeHolders);
    }

    this.skipTerms = false;
    this.skipStart = false;
    this.skipCountrySelection = false;

    store.remove(CITIZENSHIP_LS_KEY);
    store.remove(FEE_HOLDER_LS_KEY);
    store.remove(PAYER_LS_KEY);
    store.remove(TERMS_LS_KEY);

    this.citizenship = null;
    this.termsAccepted = false;

    this.emit('restart');
    this.goto('start');
  }

  addError (error) {
    if (!error) {
      return;
    }

    // If it's not a client error, don't show it
    if (error.status && (error.status < 400 || error.status >= 500)) {
      return console.error(error);
    }

    console.error(error);
    this.addMessage({ content: error.message, type: 'error', title: 'An error occured' });
  }

  @action addMessage ({ title, content, type }) {
    const id = nextErrorId++;

    this.messages = Object.assign({}, this.messages, { [id]: { title, content, type, id } });
  }

  @action removeMessage (id) {
    const messages = Object.assign({}, this.messages);

    delete messages[id];
    this.messages = messages;
  }

  @action setLoading (loading) {
    this.loading = loading;
  }

  @action setTermsAccepted (termsAccepted) {
    this.termsAccepted = termsAccepted;

    parentMessage({
      action: 'terms-accepted'
    });
  }

  @action setStep (step) {
    if (step === STEPS['terms'] || step === STEPS['country-selection']) {
      this.stepper = 0;
    } else if (step === STEPS['fee']) {
      this.stepper = 1;
    } else if (step === STEPS['certify']) {
      this.stepper = 2;
    } else if (step === STEPS['certified']) {
      this.stepper = 3;
    } else {
      this.stepper = -1;
    }

    this.step = step;
  }

  @action storeValidCitizenship (countryCode) {
    store.set(CITIZENSHIP_LS_KEY, countryCode);
    this.citizenship = countryCode;
  }

  storeTermsAccepted () {
    const { termsAccepted } = this;

    // Send message to iframe
    parentMessage({
      action: 'terms-accepted',
      termsAccepted
    });

    store.set(TERMS_LS_KEY, termsAccepted);
  }
}

const appStore = new AppStore();

// window.appStore = appStore;
export default appStore;
