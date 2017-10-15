import React, { Component } from 'react';
import EthJS from 'ethereumjs-util';
import { Button, Input } from 'semantic-ui-react';

import backend from '../backend';
import { isValidAddress } from '../utils';

import AppContainer from './AppContainer';
import AddressInput from './AddressInput';

const preStyle = {
  fontSize: '0.75em',
  maxWidth: '100%',
  whiteSpace: 'pre-line',
  backgroundColor: '#eee',
  border: '1px solid black',
  lineHeight: '1.5em',
  padding: '0.5em 1em',
  wordWrap: 'break-word'
};

export default class CheckRefund extends Component {
  state = {
    address: '',
    loaded: false
  };

  render () {
    const { address } = this.state;

    return (
      <AppContainer
        hideStepper
        style={{ textAlign: 'center', padding: '2.5em 1em 2em', maxWidth: '60em', margin: '0 auto' }}
      >
        <div>
          <div style={{ marginBottom: '1.5em' }}>
            <AddressInput
              onChange={this.handleAddressChange}
              value={address}
            />
            <Input
              fluid
              label='Message'
              onChange={this.handleMessageChange}
            />
            <br />
            <Input
              fluid
              label='Signature'
              onChange={this.handleSignatureChange}
            />
          </div>

          {this.renderResult()}

          <div>
            <Button secondary as='a' href='/#/'>
              Back to PICOPS
            </Button>
          </div>
        </div>
      </AppContainer>
    );
  }

  renderResult () {
    const { error, recoveredAddress, origins } = this.state;

    if (error) {
      return (
        <div>
          <p>An error occurred:</p>
          <pre style={preStyle}>{error.toString()}</pre>
        </div>
      );
    }

    if (recoveredAddress) {
      return (
        <div>
          <p>Recovered address from signature:</p>
          <pre style={preStyle}>{recoveredAddress}</pre>
          <p>Payment origins:</p>
          <pre style={preStyle}>{JSON.stringify(origins)}</pre>
        </div>
      );
    }

    return null;
  }

  checkValues = async () => {
    const { address, message, signature } = this.state;

    if (isValidAddress(address) && message && signature) {
      try {
        const { origins } = await backend.getAccountFeeInfo(address);
        const msgHash = EthJS.hashPersonalMessage(EthJS.toBuffer(message));
        const { v, r, s } = EthJS.fromRpcSig(signature);
        const publicKey = EthJS.ecrecover(msgHash, v, r, s);

        const recoveredAddress = '0x' + EthJS.pubToAddress(publicKey).toString('hex');

        this.setState({ error: null, recoveredAddress, origins });
      } catch (error) {
        this.setState({ error });
      }
    }
  };

  handleAddressChange = (_, { value }) => {
    this.setState({ address: value, error: null }, this.checkValues);
  };

  handleMessageChange = (_, { value }) => {
    this.setState({ message: value, error: null }, this.checkValues);
  };

  handleSignatureChange = (_, { value }) => {
    this.setState({ signature: value, error: null }, this.checkValues);
  };
}
