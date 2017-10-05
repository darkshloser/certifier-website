import React, { Component } from 'react';
import { Button, Header, Icon } from 'semantic-ui-react';

import backend from '../backend';
import { isValidAddress } from '../utils';

import AppContainer from './AppContainer';
import AddressInput from './AddressInput';

export default class Check extends Component {
  state = {
    address: '',
    certified: null
  };

  render () {
    const { address } = this.state;

    return (
      <AppContainer
        hideStepper
        style={{ textAlign: 'center', padding: '2.5em 1em 1em', maxWidth: '60em', margin: '0 auto' }}
        title=''
      >
        <div>
          <div style={{ marginBottom: '1.5em' }}>
            <Header as='h4' style={{ textTransform: 'uppercase' }}>
              Enter an Ethereum address bellow to check
              its certification status
            </Header>
            <AddressInput
              onChange={this.handleAddressChange}
              value={address}
            />
          </div>

          {this.renderCertified()}

          <div>
            <Button secondary as='a' href='/#/'>
              Go Back
            </Button>
          </div>
        </div>
      </AppContainer>
    );
  }

  renderCertified () {
    const { certified } = this.state;

    if (certified === null) {
      return null;
    }

    if (certified) {
      return (
        <div style={{ fontSize: '2em', color: 'green', margin: '1em 0 0.75em', fontWeight: '200' }}>
          <Icon name='check' color='green' />
          <span style={{ marginLeft: '0.25em' }}>
            This address is certified!
          </span>
        </div>
      );
    }

    return (
      <div style={{ fontSize: '2em', color: 'red', margin: '1em 0 0.75em', fontWeight: '200' }}>
        <Icon name='remove' color='red' />
        <span style={{ marginLeft: '0.25em' }}>
          This address is not certified yet
        </span>
      </div>
    );
  }

  handleAddressChange = async (_, { value }) => {
    this.setState({ address: value, certified: null });

    if (isValidAddress(value)) {
      const { certified } = await backend.checkStatus(value);

      this.setState({ certified });
    }
  };
}
