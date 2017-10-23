module.exports = {
  certifierContract: '0x1e2F058C43ac8965938F6e9CA286685A3E63F24E',
  certifierHandler: {
    // `address` and `minedBlock` to be filled
  },
  feeContract: '0xDd9b54d1dd185f9302E24dd3AE9E652453f74705',
  // Fallback for older fee contracts,
  // version being the ABI version (currently 2)
  fallbackFeeContracts: [
    { address: '0xccaf7B08a3AF4a5cCB7226C7BcddE917764e2d13', version: 1 },
    { address: '0xE188eA15AA9a8CeaE23A9F77FF4a356681D35f33', version: 0 }
  ],
  etherscan: 'https://etherscan.io',

  // Gas Price of 20 Gwei
  gasPrice: '0x' + (20 * Math.pow(10, 9)).toString(16)
};
