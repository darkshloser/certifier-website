const kovan = require('./kovan');

module.exports = Object.assign({}, kovan, {
  http: {
    hostname: '127.0.0.1',
    port: 4000
  },
  nodeWs: 'ws://127.0.0.1:8546/',
  onfido: {
    token: '',
    webhookToken: '',
    maxChecks: 3
  },
  redis: {
    host: '127.0.0.1',
    port: 6379
  },
  account: {
    filename: 'empty-phrase.json',
    password: ''
  }
});
