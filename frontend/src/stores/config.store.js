import backend from '../backend';

class Config {
  loaded = false;

  constructor () {
    this.load().catch((error) => {
      console.error(error);
    });
  }

  async load () {
    if (this.loaded) {
      return;
    }

    const conf = await backend.config();

    Object.keys(conf).forEach((key) => {
      this[key] = conf[key];
    });

    this.loaded = true;
  }

  get (key) {
    const value = this[key];

    if (!value) {
      throw new Error(`Could not find key '${key}' in config`);
    }

    return value;
  }
}

export default new Config();
