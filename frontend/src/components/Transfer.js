import BigNumber from 'bignumber.js';
import React, { Component } from 'react';
import { Button, Header, Loader } from 'semantic-ui-react';

import backend from '../backend';
import config from '../stores/config.store';
import { fromWei, isValidAddress } from '../utils';
import appStore from '../stores/app.store';
import feeStore from '../stores/fee.store';
import Transaction from '../stores/transaction';

import AppContainer from './AppContainer';
import AddressInput from './AddressInput';
import AccountInfo from './AccountInfo';

const GAS_LIMIT = new BigNumber(21000);

export default class Transfer extends Component {
  state = {
    address: '',
    loading: true,
    sending: false,
    storedAddress: null,
    transaction: null
  };

  componentWillMount () {
    this.init().catch((error) => appStore.addError(error));
  }

  async init () {
    const { storedPhrase } = feeStore;

    if (!storedPhrase) {
      return this.setState({ loading: false });
    }

    const { address: storedAddress, secret: storedSecret } = await feeStore.getWallet();

    this.setState({
      loading: false,
      storedAddress,
      storedSecret
    });
  }

  render () {
    return (
      <AppContainer
        hideStepper
        style={{ textAlign: 'center', padding: '2.5em 1em 2em', maxWidth: '60em', margin: '0 auto' }}
        title=''
      >
        <div>
          <div style={{ marginBottom: '1.5em' }}>
            <Header as='h4' style={{ textTransform: 'uppercase' }}>
              Transfer your funds
            </Header>
            {this.renderContent()}
          </div>

          <div>
            <Button secondary as='a' href='/#/'>
              Go Back
            </Button>
          </div>
        </div>
      </AppContainer>
    );
  }

  renderContent () {
    const { address, loading, sending, storedAddress, transaction } = this.state;

    if (loading) {
      return (
        <Loader />
      );
    }

    if (!storedAddress) {
      return (
        <p>
          It seemed that you cleared your cache.
          There is nothing we can do...
        </p>
      );
    }

    const valid = isValidAddress(address) && (address.toLowerCase() !== storedAddress.toLowerCase());

    return (
      <div>
        <AccountInfo
          address={storedAddress}
          showCertified={false}
        />
        <Header as='h4'>
          Enter an Ethereum address to which the funds should be
          transfered
        </Header>
        <AddressInput
          onChange={this.handleAddressChange}
          value={address}
        />
        <div style={{ margin: '1.5em 0' }}>
          {
            transaction
              ? (
                <Button primary basic as='a' href={`https://etherscan.io/tx/${transaction}`}>
                  View transaction on Etherscan
                </Button>
              )
              : (
                <Button disabled={!valid} primary size='big' onClick={this.handleSend} loading={sending}>
                  Send
                </Button>
              )
          }
        </div>
      </div>
    );
  }

  handleAddressChange = async (_, { value }) => {
    this.setState({ address: value });
  };

  handleSend = async () => {
    this.setState({ sending: true });

    try {
      const { address, storedAddress, storedSecret } = this.state;

      const { balance } = await backend.getAccountFeeInfo(storedAddress);
      const gasPrice = config.get('gasPrice');
      const totalGas = GAS_LIMIT.mul(gasPrice);

      if (balance.lt(totalGas)) {
        throw new Error(`Not enough funds to send a transaction, missing ${fromWei(totalGas.sub(balance))} ETH...`);
      }

      const transaction = new Transaction(storedSecret);
      const { hash } = await transaction.send({
        gasLimit: GAS_LIMIT,
        to: address,
        value: balance.sub(totalGas)
      });

      console.warn('sent tx', hash);
      this.setState({ sending: false, transaction: hash });
    } catch (error) {
      appStore.addError(error);
      this.setState({ sending: false });
    }
  };
}
