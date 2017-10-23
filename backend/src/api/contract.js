// Copyright Parity Technologies (UK) Ltd., 2017.
// Released under the Apache 2/MIT licenses.

'use strict';

const BigNumber = require('bignumber.js');
const EthereumAbi = require('ethereumjs-abi');
const EthereumTx = require('ethereumjs-tx');
const { privateToAddress } = require('ethereumjs-util');

const logger = require('../logger');
const { buf2hex, ejs2val, hex2buf } = require('../utils');

class Event {
  /**
   * Abstraction over a contract event
   *
   * @param {Object}  iface  The event interface (from the ABI)
   */
  constructor (iface) {
    const { inputs, name } = iface;

    const types = inputs.map((input) => input.type);
    const id = EthereumAbi.eventID(name, types);

    this._topic = buf2hex(id);

    this._name = name;
    this._inputs = inputs;
  }

  /**
   * Event topic
   *
   * @return {String} `0x` prefixed hex-encoded 32 bytes
   */
  get topic () {
    return this._topic;
  }

  encode (filters = []) {
    const inputs = this._inputs
      .filter((input) => input.indexed);

    const topics = [ this.topic ];

    filters
      .forEach((filter, index) => {
        const input = inputs[index];

        topics[index + 1] = this.encodeFitler(filter, input.type);
      });

    return topics;
  }

  encodeFitler (filter, type) {
    if (filter === null) {
      return null;
    }

    if (Array.isArray(filter)) {
      return filter.map((f) => this.encodeFitler(f, type));
    }

    return '0x' + EthereumAbi.rawEncode([ type ], [ filter ]).toString('hex');
  }

  decode (logs) {
    return logs.map((log) => {
      log.event = this._name;
      log.params = {};

      this._inputs
        .filter((input) => input.indexed)
        .map((input, index) => {
          const rawValue = log.topics[index + 1];
          const value = EthereumAbi.rawDecode([ input.type ], hex2buf(rawValue))[0];

          log.params[input.name] = ejs2val(value, input.type);
        });
      const dataInputs = this._inputs.filter((input) => !input.indexed);
      const dataTypes = dataInputs.map((input) => input.type);
      const values = EthereumAbi.rawDecode(dataTypes, hex2buf(log.data));

      values.forEach((value, index) => {
        const input = dataInputs[index];

        log.params[input.name] = ejs2val(value, input.type);
      });

      return log;
    });
  }
}

class Method {
  /**
   * Abstraction over a contract function
   *
   * @param {Object}  iface  The function interface (from the ABI)
   */
  constructor (iface) {
    const { inputs, outputs, name } = iface;

    const types = inputs.map((input) => input.type);
    const id = EthereumAbi.methodID(name, types);

    this._id = buf2hex(id.slice(0, 4));
    this._types = types;

    this._name = name;
    this._inputs = inputs;
    this._outputs = outputs;
  }

  /**
   * Function id
   *
   * @return {String} `0x` prefixed hex-encoded 4 bytes
   */
  get id () {
    return this._id;
  }

  encode (args = []) {
    const params = [].concat(args);
    const types = this._types;

    if (params.filter((p) => p !== undefined).length !== types.length) {
      throw new Error(`Expected ${types.length} params for "${this._name}" ; ${JSON.stringify(params)} given`);
    }

    const nextParams = params.map((param) => {
      if (param instanceof BigNumber) {
        return param.toNumber().toString();
      }

      return param;
    });
    const encoded = EthereumAbi.rawEncode(types, nextParams);

    return this.id + encoded.toString('hex');
  }

  decode (data) {
    const types = this._outputs.map((output) => output.type);
    const decoded = EthereumAbi.rawDecode(types, hex2buf(data));

    return decoded.map((value, index) => {
      const type = types[index];

      return ejs2val(value, type);
    });
  }
}

class Contract {
  /**
   * Abstraction over an Ethereum contract
   *
   * @param {RpcTransport} transport
   * @param {String}       address    `0x` prefixed contract address
   * @param {Array}        abi        The contract ABI
   * @param {Array}        statics    The names of constant storage values
   *                                  (ie. that won't change)
   */
  constructor (connector, address, abi, statics = []) {
    this._abi = abi;
    this._address = address.toLowerCase();
    this._connector = connector;
    this._transport = connector.transport;
    this._statics = statics;

    this._constants = new Map();
    this._methods = new Map();
    this._events = new Map();

    this.methods = {};
    this.events = {};
    this.values = {};

    this.filters = [];

    this.connector.on('block', () => this.checkFilters());

    abi.forEach((iface) => {
      const { constant, name, type } = iface;

      if (type === 'function') {
        const method = new Method(iface);

        // Constants are methods of the contract that
        // takes no inputs, and has one output, for example
        // the contract public storage
        if (constant && iface.inputs.length === 0 && iface.outputs.length === 1) {
          this._constants.set(name, method);
        }

        this.methods[name] = (...params) => {
          const data = method.encode(params);

          if (constant) {
            return {
              get: () => this._call(method, data),
              data
            };
          }

          return {
            post: (options, privateKey) => this._post(method, data, options, privateKey),
            data
          };
        };
      } else if (type === 'event') {
        const event = new Event(iface);

        this._events.set(name, event);
        this._events.set(event.topic, event);

        this.events[name] = (...filters) => {
          const topics = event.encode(filters);

          return {
            get: (options) => this._logs(topics, options)
          };
        };
      }
    });
  }

  get address () {
    return this._address;
  }

  get connector () {
    return this._connector;
  }

  get transport () {
    return this._transport;
  }

  checkFilters () {
    this.filters.forEach(async ({ id, callback }) => {
      try {
        const logs = await this.transport.request('eth_getFilterChanges', id);

        if (logs.length === 0) {
          return;
        }

        const filteredLogs = logs.filter((log) => log.address === this.address);

        callback(this.parse(filteredLogs));
      } catch (error) {
        logger.error(error);
      }
    });
  }

  /**
   * Parse the given logs for the contract events
   *
   * @param {Array}  logs array of log objects as returned from Parity
   *
   * @return {Array} logs enhanced with the `event` and `params` fields
   */
  parse (logs) {
    return logs.map((log) => {
      const topic = log.topics[0];
      const event = this._events.get(topic);

      if (!event) {
        logger.warn('could not find an event for this log', log.topics);
        return log;
      }

      return event.decode([ log ])[0];
    });
  }

  async subscribe (eventNames, options, callback) {
    if (typeof options === 'function' && !callback) {
      return this.subscribe(eventNames, {}, options);
    }

    const eventsTopics = eventNames.map((eventName) => {
      if (!this._events.has(eventName)) {
        throw new Error(`Unknown event ${eventName}`);
      }

      return this._events.get(eventName).topic;
    });

    const filterTopics = [ eventsTopics ].concat(options.topics || []);
    const filterOptions = Object.assign({}, options, {
      address: this.address,
      topics: filterTopics
    });

    const filterId = await this.transport.request('eth_newFilter', filterOptions);

    this.filters.push({ id: filterId, callback });
    return filterId;
  }

  async unsubscribe (filterId) {
    await this.transport.request('eth_uninstallFilter', filterId);
    this.filters = this.filters.filter((f) => f.id !== filterId);
  }

  /**
   * Get all the event logs for the specified events
   *
   * @param  {[String]}  eventNames
   * @param  {Object}    options     - The options to pass the eth_getLogs
   * @return {Promise<Array>}
   */
  async logs (eventNames, options) {
    const events = eventNames.map((eventName) => {
      if (!this._events.has(eventName)) {
        throw new Error(`Unknown event ${eventName}`);
      }

      return this._events.get(eventName);
    });

    const topics = [ events.map((event) => event.topic) ];

    return this._logs(topics, options);
  }

  /**
   * Update the contract constants and attach the
   * new value to the contract
   *
   * @param  {String} methodName  The update can be filtered by method name
   * @return {Promise}
   */
  async update (methodName) {
    let methodNames = [];

    if (methodName) {
      if (!this._methods.has(methodName)) {
        throw new Error(`The contract has no method ${methodName}`);
      }

      methodNames = [methodName];
    } else {
      for (const name of this._constants.keys()) {
        methodNames.push(name);
      }
    }

    methodNames = methodNames.filter((name) => {
      return !this._statics.includes(name) || this.values[name] === undefined;
    });

    const promises = methodNames.map((name) => {
      return this.methods[name]().get();
    });

    return Promise.all(promises)
      .then((results) => {
        methodNames.forEach((name, index) => {
          this.values[name] = results[index][0];
        });
      });
  }

  /**
   * Call into a registered contract function
   *
   * @param  {Object}  method of the function
   * @param  {String}  data - Hex encoded data
   *
   * @return {Promise<Array>} decoded result of `eth_call`
   */
  _call (method, data) {
    return this
      .transport
      .request('eth_call', {
        to: this._address,
        data,
        gasPrice: '0x0'
      })
      .then((result) => {
        return method.decode(result);
      });
  }

  _logs (topics, options) {
    return this
      .transport
      .request('eth_getLogs', Object.assign({}, {
        fromBlock: '0x0',
        toBlock: 'latest',
        address: this.address,
        topics
      }, options))
      .then((logs) => this.parse(logs));
  }

  async _post (method, data, _options = {}, privateKey) {
    const from = '0x' + privateToAddress(privateKey).toString('hex');
    const { connector } = this;
    const options = Object.assign(
      {
        from,
        value: '0x0'
      },
      _options,
      {
        to: this.address,
        data
      }
    );

    if (!options.gasLimit) {
      const gasLimit = await connector.estimateGas(options);

      options.gasLimit = gasLimit;
    }

    const nonce = await connector.nextNonce(options.from);

    options.nonce = nonce;

    const tx = new EthereumTx(options);

    tx.sign(privateKey);

    const serializedTx = `0x${tx.serialize().toString('hex')}`;

    const txHash = await connector.sendTx(serializedTx);

    return txHash;
  }
}

module.exports = Contract;
