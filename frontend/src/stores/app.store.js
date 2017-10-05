import { countries } from 'country-data';
import EventEmitter from 'eventemitter3';
import { iframeResizerContentWindow } from 'iframe-resizer';
import { difference, uniq } from 'lodash';
import { action, observable } from 'mobx';
import store from 'store';

import backend from '../backend';
import config from './config.store';
import { parentMessage } from '../utils';

export const CITIZENSHIP_LS_KEY = '_parity-certifier::citizenship';
export const FEE_HOLDER_LS_KEY = '_parity-certifier::fee-holder';
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
  loaders = {};
  padding = true;
  showStepper = true;

  skipCountrySelection = false;
  skipStart = false;
  skipTerms = false;
  showAbi = true;

  queryCommands = {
    'no-padding': () => {
      this.padding = false;
      this.showAbi = false;

      // Call the iframe resizer method so
      // parent embedding PICOPS can set
      // the iframe height automatically
      return console.warn(iframeResizerContentWindow);
    },
    'extraneous': () => {
      this.showAbi = false;
    },
    'no-stepper': () => {
      this.showStepper = false;
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

  @observable loading = true;
  @observable messages = {};
  @observable termsAccepted = false;
  @observable step;
  @observable stepper = -1;

  constructor () {
    super();

    window
      .location
      .search
      .substr(1) // skip '?'
      .split('&')
      .map((chunk) => chunk.split('='))
      .forEach(([key, value]) => {
        if (this.queryCommands[key]) {
          this.queryCommands[key](value);
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

  async goto (name) {
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
    return Promise.resolve([ 'USA', 'IRN', 'SYR', 'CUB', 'PKR' ]);
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

    const prevCountries = store.get(CITIZENSHIP_LS_KEY) || [];

    // The country selection can be skipped if the user
    // already said he was not from on of the
    // current blacklisted countries
    this.skipCountrySelection = difference(
      this.blacklistedCountries,
      prevCountries
    ).length === 0;
  }

  register (step, loader) {
    if (!STEPS[step]) {
      throw new Error(`unknown step ${step}`);
    }

    this.loaders[step] = (this.loaders[step] || []).concat(loader);
  }

  restart () {
    this.skipTerms = false;
    this.skipStart = false;

    store.remove(CITIZENSHIP_LS_KEY);
    store.remove(FEE_HOLDER_LS_KEY);
    store.remove(PAYER_LS_KEY);
    store.remove(TERMS_LS_KEY);

    this.termsAccepted = false;

    this.emit('restart');
    this.goto('start');
  }

  addError (error) {
    if (!error) {
      return console.error('no error given....', error);
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

  storeValidCitizenship () {
    const prevState = store.get(CITIZENSHIP_LS_KEY) || [];
    const nextState = uniq(prevState.concat(this.blacklistedCountries));

    store.set(CITIZENSHIP_LS_KEY, nextState);
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
