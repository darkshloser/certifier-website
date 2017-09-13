import { countries } from 'country-data';
import EventEmitter from 'eventemitter3';
import { difference, uniq } from 'lodash';
import { action, observable } from 'mobx';
import store from 'store';

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

const padding = window.location.hash !== '#no-padding';

if (padding) {
  document.body.style.backgroundColor = '#f1f1f1';
}

class AppStore extends EventEmitter {
  blacklistedCountries = [];
  loaders = {};
  padding = padding;

  skipCountrySelection = false;
  skipTerms = false;

  @observable loading = false;
  @observable termsAccepted = false;
  @observable step = STEPS['start'];

  constructor () {
    super();

    this.loadCountries();

    if (store.get(TERMS_LS_KEY) === true) {
      this.skipTerms = true;
    }
  }

  async setCertified (address) {
    if (window.parent) {
      window.parent.postMessage(JSON.stringify({ address }), '*');
    }

    this.goto('certified');
  }

  async goto (name) {
    if (!STEPS[name]) {
      throw new Error(`unkown step ${name}`);
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
    this.setLoading(true);

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

    this.setLoading(false);
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
    store.remove(TERMS_LS_KEY);

    this.termsAccepted = false;
    this.emit('restart');
    this.goto('start');
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

  storeTermsAccepted () {
    store.set(TERMS_LS_KEY, this.termsAccepted);
  }
}

export default new AppStore();
