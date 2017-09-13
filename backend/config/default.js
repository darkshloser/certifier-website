module.exports = {
  http: {
    hostname: '127.0.0.1',
    port: 4000
  },
  nodeWs: 'ws://127.0.0.1:8546/',
  feeContract: '0xa18376621ed621e22de44679f715bfdd15c9b6f9',
  certifierContract: '0x06C4AF12D9E3501C173b5D1B9dd9cF6DCC095b98',
  onfido: {
    token: 'test_AQC7JrCe01PDsf6s8YGtg7aId5y2Mw0x'
  },
  redis: {
    host: '127.0.0.1',
    port: 6379
  },
  recaptcha: {
    secret: '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe'
  },
  account: {
    filename: 'empty-phrase.json',
    password: ''
  },
  // Gas Price of 2GWei
  gasPrice: '0x77359400'
};
