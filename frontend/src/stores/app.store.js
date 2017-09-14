import { countries } from 'country-data';
import EventEmitter from 'eventemitter3';
import { difference, uniq } from 'lodash';
import { action, observable } from 'mobx';
import store from 'store';

export const CITIZENSHIP_LS_KEY = '_parity-certifier::citizenship';
export const FEE_HOLDER_LS_KEY = '_parity-certifier::fee-holder';
export const PAYER_LS_KEY = '_parity-certifier::payer';
export const STARTED_LS_KEY = '_parity-certifier::started';
export const TERMS_LS_KEY = '_parity-certifier::agreed-terms::v1';

export const STEPS = {
  'start': Symbol('start'),
  'terms': Symbol('terms'),
  'country-selection': Symbol('country selection'),
  'fee': Symbol('fee'),
  'certify': Symbol('certify'),
  'certified': Symbol('certified')
};

const padding = window.location.search !== '?no-padding';
let nextErrorId = 1;

if (padding) {
  document.querySelector('body').style.backgroundColor = '#f1f1f1';
  document.querySelector('html').style.backgroundColor = '#f1f1f1';
}

class AppStore extends EventEmitter {
  blacklistedCountries = [];
  loaders = {};
  padding = padding;

  skipCountrySelection = false;
  skipStart = false;
  skipTerms = false;

  @observable loading = true;
  @observable messages = {};
  @observable termsAccepted = false;
  @observable step;

  constructor () {
    super();

    this.load();
  }

  load = async () => {
    if (store.get(TERMS_LS_KEY) === true) {
      this.skipTerms = true;
    }

    if (store.get(STARTED_LS_KEY) === true) {
      this.skipStart = true;
    }

    await this.loadCountries();
    this.goto('start');
  };

  async setCertified (address) {
    if (window.parent) {
      const action = 'certified';

      window.parent.postMessage(JSON.stringify({ address, action }), '*');
    }

    this.goto('certified');
  }

  async goto (name) {
    if (!STEPS[name]) {
      throw new Error(`unkown step ${name}`);
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
        await loader();
      }
    }

    this.setLoading(false);
  }

  async fetchBlacklistedCountries () {
    return new Promise((resolve) => {
      const list = [
        'USA', 'JPN', 'FRA'
      ];

      return resolve(list);
    });
  }

  async loadCountries () {
    const blCountries = await this.fetchBlacklistedCountries();

    this.blacklistedCountries = blCountries
      .filter((countryKey) => {
        if (!countries[countryKey]) {
          console.error(new Error('unkown country key: ' + countryKey));
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
      throw new Error(`unkown step ${step}`);
    }

    this.loaders[step] = (this.loaders[step] || []).concat(loader);
  }

  restart () {
    store.remove(CITIZENSHIP_LS_KEY);
    store.remove(FEE_HOLDER_LS_KEY);
    store.remove(PAYER_LS_KEY);
    store.remove(STARTED_LS_KEY);
    store.remove(TERMS_LS_KEY);

    this.termsAccepted = false;
    this.emit('restart');
    this.goto('start');
  }

  addError (error) {
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
  }

  @action setStep (step) {
    this.step = step;
  }

  storeValidCitizenship () {
    const prevState = store.get(CITIZENSHIP_LS_KEY) || [];
    const nextState = uniq(prevState.concat(this.blacklistedCountries));

    store.set(CITIZENSHIP_LS_KEY, nextState);
  }

  storeStarted () {
    store.set(STARTED_LS_KEY, true);
  }

  storeTermsAccepted () {
    store.set(TERMS_LS_KEY, this.termsAccepted);
  }
}

const appStore = new AppStore();

window.appStore = appStore;
export default appStore;
