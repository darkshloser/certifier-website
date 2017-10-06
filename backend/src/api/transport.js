// Copyright Parity Technologies (UK) Ltd., 2017.
// Released under the Apache 2/MIT licenses.

'use strict';

const WebSocket = require('ws');

const { hex2int, pause, keccak256 } = require('../utils');

class Subscription {
  /**
   * Abstraction over the Parity RPC PubSub subscription.
   *
   * @param {String}     method RPC method name
   * @param {Array<Any>} params RPC parameters
   */
  constructor (method, params) {
    this._method = method;
    this._params = params;
    this._listeners = [];
  }

  /**
   * Attach a listener closure to execute on each new update.
   *
   * @param  {Function}     listener closure to execute
   *
   * @return {Subscription}          self
   */
  forEach (listener) {
    this._listeners.push(listener);

    return this;
  }

  /**
   * Push a new update onto the subscription listeners.
   *
   * @param {Any} update new response from the node
   */
  push (update) {
    for (const listener of this._listeners) {
      listener(update);
    }
  }

  /**
   * Get the RPC method name
   *
   * @return {String}
   */
  get method () {
    return this._method;
  }

  /**
   * Get the RPC parameters
   *
   * @return {Array<Any>}
   */
  get params () {
    return this._params;
  }
}

class Request {
  /**
   * Abstraction over the JSON-RPC request, used only internally.
   *
   * @param {Object}   message the JSON object sent to the node
   * @param {Function} resolve wrapping Promise callback
   * @param {Function} reject  wrapping Promise callback
   * @param {Function} cleanUp closure to call once the request is done
   * @param {Error}     error   an empty error (useful for the stack)
   */
  constructor (message, resolve, reject, cleanUp, error) {
    this._message = message;
    this._cleanUp = cleanUp;
    this._resolve = resolve;
    this._reject = reject;
    this._error = error;
    this._timeout = setTimeout(() => {
      cleanUp();

      reject(new Error(`request timed out: ${message.method}`));
    }, 25000);
  }

  /**
   * Resolve the request promise.
   *
   * @param  {Object} response from the node
   */
  resolve (response) {
    clearTimeout(this._timeout);

    this._cleanUp();
    this._resolve(response);
  }

  /**
   * Reject the request promise.
   *
   * @param  {Object} error
   */
  reject (error) {
    clearTimeout(this._timeout);

    this._cleanUp();

    if (!(error instanceof Error) && error && error.message) {
      this._error.message = error.message;
      this._reject(this._error);
    } else {
      this._reject(error);
    }
  }
}

class RpcTransport {
  /**
   * Abstraction over the JSON-RPC WebSocket API.
   * Allows to perform requests as Promises and subscribe to methods.
   *
   * @param {String} url WebSocket to connect to
   */
  constructor (url) {
    this._url = url;
    this._connected = false;
    this._id = 0;
    this._requests = new Map();
    this._subscriptions = new Map();

    this.connect();
  }

  /**
   * Check the status of the WebSocket connection.
   *
   * @return {Boolean}
   */
  get connected () {
    return this._connected;
  }

  /**
   * Connect to the JSON-RPC WebSocket.
   *
   * @return {Promise<WebSocket>}
   */
  connect () {
    this._ws = new Promise((resolve, reject) => {
      console.log('Connecting to the Parity node...');

      const ws = new WebSocket(this._url, {
        perMessageDeflate: false
      });

      ws.on('error', (e) => {
        console.error('WebSocket error:', e.code);
      });

      ws.on('open', () => {
        console.log('Connected to the Parity node!');

        this._connected = true;

        resolve(ws);

        this._resubscribe();
      });

      ws.on('close', async () => {
        this._connected = false;

        console.error('Disconnected from the Parity node!');

        await pause(1000);

        this.connect().then(resolve, reject);
      });

      ws.on('message', (json) => this._handleMessage(json));
    });

    return this._ws;
  }

  /**
   * Handle incoming WebSocket messages, interpreting them as either responses
   * or subscription pushes.
   *
   * @param {String} json String passed from the message
   */
  _handleMessage (json) {
    const message = JSON.parse(json);
    const requests = this._requests;

    if (message.jsonrpc !== '2.0') {
      console.error('Invalid JSON');
    }

    if (typeof message.id === 'number' && (message.result !== undefined || message.error !== undefined)) {
      const { id, result, error } = message;

      if (!requests.has(id)) {
        console.error(`Invalid JSON-RPC response id: ${id}`);

        return;
      }

      if (error) {
        requests.get(id).reject(error);
      } else {
        requests.get(id).resolve(result);
      }

      return;
    }

    if (message.method === 'parity_subscription' && message.params) {
      const { error, result } = message.params;
      const subId = hex2int(message.params.subscription);
      const subscription = this._subscriptions.get(subId);

      if (error) {
        console.error(`Subscription error on ${subscription.method}:`, error);

        return;
      }

      if (subscription) {
        subscription.push(result);
      }
    }
  }

  /**
   * Yield the next id for JSON-RPC
   *
   * @return {Number} id integer
   */
  nextId () {
    return ++this._id;
  }

  /**
   * Perform a single request to JSON-RPC API.
   *
   * @param  {String} method RPC method name
   * @param  {...Any} params RPC parameters
   *
   * @return {Any}           result from the API
   */
  async request (method, ...params) {
    const error = new Error();
    const ws = await this._ws;
    const id = this.nextId();
    const requests = this._requests;
    const message = {
      id,
      method,
      params,
      jsonrpc: '2.0'
    };

    ws.send(JSON.stringify(message));

    return new Promise((resolve, reject) => {
      const request = new Request(message, resolve, reject, () => requests.delete(id), error);

      requests.set(id, request);
    });
  }

  /**
   * Create a subscription on the node, returning a new Subscription instance.
   *
   * @param  {String}       method RPC method name
   * @param  {...Any}       params RPC parameters
   *
   * @return {Subscription}
   */
  subscribe (method, ...params) {
    const subscription = new Subscription(method, params);

    return this._subscribe(subscription);
  }

  /**
   * Create a subscription on the node, and bind the existing Subscription instance to it.
   *
   * @param  {Subscription} subscription
   *
   * @return {Subscription}
   */
  _subscribe (subscription) {
    const { method, params } = subscription;

    this
      .request('parity_subscribe', method, params)
      .then((subId) => {
        this._subscriptions.set(hex2int(subId), subscription);
      });

    return subscription;
  }

  /**
   * Restore subscriptions after a reconnect
   */
  _resubscribe () {
    const subscribtions = this._subscriptions.values();

    this._subscriptions = new Map();

    for (const subscription of subscribtions) {
      this._subscribe(subscription);
    }
  }
}

class CachingTransport extends RpcTransport {
  /**
   * Variant of `RpcTransport` that will cache request results
   *
   * @param {String} url WebSocket to connect to
   */
  constructor (url) {
    super(url);

    this._requestCache = new Map();
  }

  /**
   * Clear the internal requests cache.
   */
  invalidateCache () {
    this._requestCache.clear();
  }

  /**
   * Perform a single request to JSON-RPC API.
   *
   * @param  {String} method RPC method name
   * @param  {...Any} params RPC parameters
   *
   * @return {Any}           result from the API
   */
  async request (method, ...params) {
    const requestCache = this._requestCache;
    const hash = keccak256(JSON.stringify({ method, params })).slice(-20);
    const cached = requestCache.get(hash);

    if (cached) {
      return cached;
    }

    const promise = super.request(method, ...params);

    requestCache.set(hash, promise);

    if (requestCache.size > 10000) {
      // Start dropping keys in FIFO fashion
      requestCache.delete(requestCache.keys().next().value);
    }

    return promise;
  }
}

module.exports = {
  RpcTransport,
  CachingTransport
};
