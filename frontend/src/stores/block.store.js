import { action, observable } from 'mobx';
import EventEmitter from 'eventemitter3';

import backend from '../backend';

const REFRESH_DELAY = 4000;

class BlockStore extends EventEmitter {
  @observable hash = '0x0';

  constructor () {
    super();
    this.init()
      .then(() => this.refresh());
  }

  async init () {
    const { hash } = await backend.blockHash();

    this.hash = hash;
  }

  async refresh () {
    // Check for new block-hash only if listeners are
    // listening, or if none has been fetched yet
    if (this.listeners('block', true) || !this.hash) {
      try {
        const { hash } = await backend.blockHash();

        // Same block, no updates
        if (this.hash !== hash) {
          this.update(hash);
        }
      } catch (error) {
        console.error(error);
      }
    }

    setTimeout(() => {
      this.refresh();
    }, REFRESH_DELAY);
  }

  @action
  update (hash) {
    this.hash = hash;
    this.emit('block');
  }
}

export default new BlockStore();
