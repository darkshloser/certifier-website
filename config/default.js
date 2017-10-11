module.exports = {
  http: {
    hostname: '127.0.0.1',
    port: 4000
  },
  nodeWs: 'ws://127.0.0.1:8546/',
  certifierContract: '0x06C4AF12D9E3501C173b5D1B9dd9cF6DCC095b98',
  feeContract: '0xad240Af85b212d3fF843Db11Ec2e612E8844FbcF',
  // Fallback for older fee contracts,
  // version being the ABI version (currently 2)
  fallbackFeeContracts: [
    { address: '0x994580775E1B594c5A0275a073DF1Fd431165759', version: 1 },
    { address: '0xD5d12e7c067Aecb420C94b47d9CaA27912613378', version: 0 }
  ],
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
  },
  // Gas Price of 2GWei
  gasPrice: '0x77359400'
};
