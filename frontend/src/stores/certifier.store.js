import { action, observable } from 'mobx';
import Onfido from 'onfido-sdk-ui';

import appStore from './app.store';
import blockStore from './block.store';
import feeStore from './fee.store';
import backend from '../backend';

const ONFIDO_STATUS = {
  UNKOWN: 'unkown',
  CREATED: 'created',
  PENDING: 'pending',
  COMPLETED: 'completed'
};

class CertifierStore {
  @observable error;
  @observable firstName;
  @observable lastName;
  @observable loading;
  @observable onfido;
  @observable pending;

  sdkToken = null;

  constructor () {
    appStore.register('certify', this.load);
    appStore.on('restart', this.init);

    this.init();
  }

  init = () => {
    this.error = null;
    this.firstName = '';
    this.lastName = '';
    this.loading = false;
    this.onfido = false;
    this.pending = false;
  };

  load = async () => {
    await this.checkCertification();
  };

  async createApplicant () {
    this.setError(null);
    this.setLoading(true);

    const { payer } = feeStore;
    const { firstName, lastName } = this;

    try {
      const { sdkToken } = await backend.createApplicant(payer, {
        firstName,
        lastName
      });

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
      this.setPending(true);
      await backend.createCheck(payer);
    } catch (error) {
      appStore.addError(error);
    }
  }

  mountOnfido () {
    if (this.onfidoObject || !this.shouldMountOnfido) {
      return;
    }

    this.shouldMountOnfido = false;
    this.onfidoObject = Onfido.init({
      useModal: false,
      token: this.sdkToken,
      containerId: 'onfido-mount',
      onComplete: () => this.handleOnfidoComplete(),
      steps: [
        {
          type: 'document',
          options: {
            useWebcam: true
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
      const { certified, status, result, reason } = await backend.checkStatus(payer);

      if (certified) {
        return appStore.setCertified(payer);
      }

      if (status === ONFIDO_STATUS.PENDING) {
        return this.setPending(true);
      }

      if (status === ONFIDO_STATUS.COMPLETED) {
        if (result === 'success') {
          return appStore.setCertified(payer);
        }

        this.setError(new Error('Something went wrong with your verification. Please try again.'));
      }
    } catch (error) {
      appStore.addError(error);
    }
  }

  @action
  setError (error) {
    if (error) {
      console.error(error);
    }

    this.error = error;
    this.pending = false;
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

  watchCertification () {
    this.unwatchCertification();
    blockStore.on('block', this.checkCertification, this);
  }

  unwatchCertification () {
    blockStore.removeListener('block', this.checkCertification, this);
  }
}

export default new CertifierStore();
