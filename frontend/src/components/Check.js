import React, { Component } from 'react';
import { Button, Icon } from 'semantic-ui-react';

import backend from '../backend';
import { isValidAddress } from '../utils';
import Text from './ui/Text';

import AppContainer from './AppContainer';
import AddressInput from './AddressInput';

export default class Check extends Component {
  state = {
    address: '',
    certified: null,
    loading: false
  };

  render () {
    const { address, loading } = this.state;
    const valid = isValidAddress(address);

    return (
      <AppContainer
        hideStepper
        showBack
        title='Certification status'
      >
        <Text.Container>
          <Text>
            Enter an Ethereum address below to check
            its certification status
          </Text>

          <AddressInput
            onChange={this.handleAddressChange}
            value={address}
          />

          <div style={{ textAlign: 'center' }}>
            {this.renderCertified()}
          </div>

          <div style={{ textAlign: 'right' }}>
            <Button
              loading={loading}
              disabled={!valid}
              primary
              onClick={this.handleQuery}
              size='big'
            >
              Query
            </Button>
          </div>
        </Text.Container>
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
  };

  handleQuery = async () => {
    const { address } = this.state;

    if (isValidAddress(address)) {
      this.setState({ certified: null, loading: true });

      try {
        const { certified } = await backend.checkStatus(address);

        this.setState({ certified, loading: false });
      } catch (error) {
        console.error(error);
        this.setState({ loading: false });
      }
    }
  };
}
