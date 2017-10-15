import EthJS from 'ethereumjs-util';
import { action, observable } from 'mobx';
import Onfido from 'onfido-sdk-ui';

import supportedCountries from '../../../onfido-documents/supported-documents.json';

import appStore from './app.store';
import blockStore from './block.store';
import feeStore from './fee.store';
import backend from '../backend';
import { parentMessage } from '../utils';

export const ONFIDO_REASONS = {
  // If the report has returned information that needs to be evaluated
  consider: {
    message: 'Something went wrong with your Identity Check.',
    retry: true
  },

  // If the applicant fails an identity check. This indicates there is
  // no identity match for this applicant on any of the databases searched
  unidentified: {
    message: 'Something went wrong with your Identity Check.',
    retry: true
  },

  // If the report has returned information where the check cannot be
  // processed further (poor quality image or an unsupported document).
  rejected: {
    message: 'Something went wrong with your Identity Check.\nThe image quality of the documents you uploaded might be too low.',
    retry: true
  },

  // If any other underlying verifications fail but they don’t necessarily
  // point to a fraudulent document (such as the name provided by the
  // applicant doesn’t match the one on the document)
  caution: {
    message: 'Something went wrong with your Identity Check.',
    retry: true
  },

  // If the document that is analysed is suspected to be fraudulent.
  suspected: {
    message: 'Something went wrong with your Identity Check.',
    retry: true
  },

  // Watchlist hard-match
  'blocked-watchlist': {
    message: 'For legal reasons, you cannot be certified.',
    retry: false
  },

  // If the country is USA
  'blocked-country': {
    message: 'For legal reasons, you cannot be certified.',
    retry: false
  },

  // If the document has been used before
  'used-document': {
    message: 'This document has been used before to certify an Ethereum address.',
    retry: false
  }
};

const ONFIDO_STATUS = {
  UNKNOWN: 'unknown',
  CREATED: 'created',
  PENDING: 'pending',
  COMPLETED: 'completed'
};

class CertifierStore {
  @observable errorReason;
  @observable firstName;
  @observable lastName;
  @observable loading;
  @observable onfido;
  @observable pending;
  @observable transaction;

  sdkToken;
  shouldMountOnfido;
  fetchExternalSignature;

  constructor () {
    appStore.register('certify', this.load);
    appStore.on('restart', this.init);
    appStore.on('external-payer', () => {
      this.fetchExternalSignature = true;
    });

    this.init();
  }

  init = () => {
    this._init();
  };

  @action _init () {
    this.unmountOnfido();

    this.errorReason = '';
    this.firstName = '';
    this.lastName = '';
    this.loading = false;
    this.onfido = false;
    this.pending = false;
    this.transaction = null;

    this.sdkToken = null;
    this.shouldMountOnfido = false;
  }

  load = async () => {
    await this.checkCertification();
  };

  externalSignature (data) {
    if (!parentMessage({ action: 'request-signature', data })) {
      throw new Error('Expected to receive signature from external source, but failed to hook up to one');
    }

    return new Promise((resolve, reject) => {
      const listener = (event) => {
        let message;

        try {
          message = JSON.parse(event.data);
        } catch (err) {
          console.error('Failed to parse JSON from postMessage', event);
          return;
        }

        const { action: msgAction, signature } = message;

        if (msgAction === 'signature' && signature) {
          window.removeEventListener('message', listener, false);

          resolve(signature);
        }
      };

      window.addEventListener('message', listener, false);

      setTimeout(() => {
        window.removeEventListener('message', listener, false);

        reject(new Error('External signature timeout, check PICOPS integration'));
      }, 30000);
    });
  }

  async getSignature (message) {
    if (this.fetchExternalSignature) {
      return this.externalSignature(message);
    }

    if (!feeStore.storedPhrase) {
      throw new Error('The account that sent the fee have not been found in local storage');
    }

    const wallet = await feeStore.getWallet();
    const privateKey = Buffer.from(wallet.secret.slice(2), 'hex');

    const msgHash = EthJS.hashPersonalMessage(EthJS.toBuffer(message));
    const { v, r, s } = EthJS.ecsign(msgHash, privateKey);

    return EthJS.toRpcSig(v, r, s);
  }

  async createApplicant () {
    console.warn('certifier_store::createApplicant');
    this.setLoading(true);

    const { payer } = feeStore;
    const { firstName, lastName } = this;
    const message = `PICOPS::create-applicant::${payer}::${firstName} ${lastName}`;

    let signature;

    try {
      signature = await this.getSignature(message);
    } catch (error) {
      appStore.addError(error);
      this.setLoading(false);
      return;
    }

    try {
      console.warn('certifier_store::createApplicant calling backend');
      const { sdkToken } = await backend.createApplicant(payer, {
        firstName,
        lastName,
        message,
        signature
      });

      console.warn('certifier_store::createApplicant got sdkToken : ' + sdkToken);
      this.shouldMountOnfido = true;
      this.sdkToken = sdkToken;

      this.setOnfido(true);
    } catch (error) {
      appStore.addError(error);
    }

    this.setLoading(false);
  }

  async handleOnfidoComplete () {
    const { payer } = feeStore;

    try {
      await backend.createCheck(payer, { sdkToken: this.sdkToken });
      this.setPending(true);
    } catch (error) {
      appStore.addError(error);
      this.unmountOnfido();
      this.setLoading(false);
      this.setOnfido(false);
    }
  }

  mountOnfido () {
    if (this.onfidoObject || !this.shouldMountOnfido) {
      return;
    }

    let completed = false;

    const onComplete = () => {
      if (!completed) {
        this.handleOnfidoComplete();
        completed = true;
      }
    };

    const userCountry = supportedCountries[appStore.citizenship || ''];
    const documentTypes = userCountry
      ? userCountry.documents.map((doc) => doc.value)
      : [];

    this.shouldMountOnfido = false;
    this.onfidoObject = Onfido.init({
      useModal: false,
      token: this.sdkToken,
      containerId: 'onfido-mount',
      onComplete: onComplete,
      steps: [
        {
          type: 'document',
          options: {
            title: 'Certify your identity',
            useWebcam: false,
            types: documentTypes
          }
        },
        // 'face',
        {
          type: 'complete',
          options: {
            message: 'Your documents have been uploaded',
            submessage: 'Now you must wait until they are processed...'
          }
        }
      ]
    });
  }

  unmountOnfido () {
    if (this.onfidoObject) {
      this.onfidoObject.tearDown();
      delete this.onfidoObject;
    }
  }

  async checkCertification () {
    try {
      const { payer } = feeStore;
      const { certified, status, result, reason, txHash } = await backend.checkStatus(payer);

      if (txHash) {
        this.setTransaction(txHash);
      }

      if (certified) {
        return appStore.setCertified(payer);
      }

      if (status === ONFIDO_STATUS.UNKNOWN) {
        return;
      }

      if (status === ONFIDO_STATUS.PENDING) {
        return this.setPending(true);
      }

      if (status === ONFIDO_STATUS.COMPLETED && result !== 'success') {
        this.setErrorReason(reason);
      }
    } catch (error) {
      appStore.addError(error);
    }
  }

  @action
  setErrorReason (errorReason) {
    if (errorReason && !ONFIDO_REASONS[errorReason]) {
      return console.error(`unknown error reason: ${errorReason}`);
    }

    this.errorReason = errorReason;
  }

  @action
  setFirstName (firstName) {
    this.firstName = firstName;
  }

  @action
  setLastName (lastName) {
    this.lastName = lastName;
  }

  @action
  setLoading (loading) {
    this.loading = loading;
  }

  @action
  setOnfido (onfido) {
    this.onfido = onfido;
  }

  @action
  setPending (pending) {
    this.pending = pending;
  }

  @action
  setTransaction (transaction) {
    this.transaction = transaction;
  }

  watchCertification () {
    this.unwatchCertification();
    blockStore.on('block', this.checkCertification, this);
  }

  unwatchCertification () {
    blockStore.removeListener('block', this.checkCertification, this);
  }
}

export default new CertifierStore();
