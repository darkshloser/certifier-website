import EventEmitter from 'eventemitter3';
import { action } from 'mobx';

import backend from '../backend';

/**
 * Configuration stores.
 * Emits a `loaded` event when loaded
 */
class Config extends EventEmitter {
  loaded = false;

  constructor () {
    super();

    this.load().catch((error) => {
      console.error(error);
    });
  }

  async load () {
    if (this.loaded || this.loading) {
      return;
    }

    try {
      const conf = await backend.config();

      this.set(conf);
      this.loaded = true;
      this.emit('loaded');
    } catch (error) {
      console.error(error);
      setTimeout(() => this.load(), 1000);
    }

    this.loading = false;
  }

  @action set (conf) {
    Object.keys(conf).forEach((key) => {
      this[key] = conf[key];
    });
  }

  get (key) {
    const value = this[key];

    if (!value) {
      throw new Error(`Could not find key '${key}' in config`);
    }

    return value;
  }

  ready (cb) {
    if (this.loaded) {
      return cb();
    }

    this.once('loaded', () => cb());
  }
}

export default new Config();
