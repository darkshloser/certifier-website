module.exports = {
  certifierContract: '0x06C4AF12D9E3501C173b5D1B9dd9cF6DCC095b98',
  certifierHandler: {
    address: '0x0B60c275677C3C97d69cC01b436333c5675C1Bcf',
    minedBlock: '0x423bc8'
  },
  feeContract: '0xad240Af85b212d3fF843Db11Ec2e612E8844FbcF',
  // Fallback for older fee contracts,
  // version being the ABI version (currently 2)
  fallbackFeeContracts: [
    { address: '0x994580775E1B594c5A0275a073DF1Fd431165759', version: 1 },
    { address: '0xD5d12e7c067Aecb420C94b47d9CaA27912613378', version: 0 }
  ],
  etherscan: 'https://kovan.etherscan.io',

  // Gas Price of 50 Gwei
  gasPrice: '0x' + (50 * Math.pow(10, 9)).toString(16)
};
