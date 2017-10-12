import { observer } from 'mobx-react';
import React, { Component } from 'react';
import { Button, Header } from 'semantic-ui-react';

import EthAccounts from '../../eth_accounts.json';

import backend from '../../backend';
import appStore from '../../stores/app.store';
import feeStore from '../../stores/fee.store';
import { isValidAddress } from '../../utils';

import AccountInfo from '../AccountInfo';
import AddressInput from '../AddressInput';

@observer
export default class FromPersonal extends Component {
  state = {
    loading: false,
    reason: null,
    valid: false
  };

  render () {
    const { valid, loading, reason } = this.state;
    const { payer, incomingChoices = [] } = feeStore;
    const knownAccount = EthAccounts[payer];

    return (
      <div>
        <Header as='h3'>
          CERTIFY MY OWN EXISTING WALLET
        </Header>
        {this.renderPersonalIncomingChoices(incomingChoices)}
        <p><b>
          Enter the Ethereum address you would like
          to certify.
        </b></p>
        <p><b>
          Don't enter an address from an exchange, such as Kraken,
          Coinbase, etc.
        </b></p>
        {
          knownAccount
            ? (
              <div>
                <div style={{ color: 'red' }}>
                  The account you have entered has been detected
                  as: <code style={{ marginLeft: '0.25em', fontSize: '0.95em' }}>{knownAccount}</code>.
                </div>
                <div>
                  Please enter the address of an Ethereum account
                  you own.
                </div>
              </div>
            )
            : null
        }
        {
          reason
            ? (
              <div style={{ color: 'red' }}>
                {reason}
              </div>
            )
            : null
        }
        <AddressInput
          onChange={this.handleWhoChange}
          onEnter={this.handleSendPayment}
          ref={this.setAddressInputRef}
          value={payer}
        />

        <div style={{ textAlign: 'right' }}>
          <Button secondary onClick={this.handleBack}>
            Back
          </Button>
          <Button primary disabled={!valid} onClick={this.handleSendPayment} loading={loading}>
            Next
          </Button>
        </div>
      </div>
    );
  }

  renderPersonalIncomingChoices (addresses) {
    if (addresses.length === 0) {
      return null;
    }

    const singular = addresses.length === 1;

    return (
      <div>
        <p>
          <b>
            We have detected incoming transactions from the following
            { singular ? ' address:' : ' addresses:' }
          </b>
          <br />
          (If you wish you can use { singular ? ' it.' : ' one of them.' })
        </p>

        {addresses.map((address) => {
          const onClick = () => {
            this.handleWhoChange(null, { value: address });

            // Focus on the input field if possible
            setTimeout(() => {
              if (this.addressInput) {
                this.addressInput.focus();
              }
            }, 50);
          };

          return (
            <div
              style={{ marginBottom: '0.75em' }}
              key={address}
            >
              <AccountInfo
                address={address}
                onClick={onClick}
                showCertified={false}
              />
            </div>
          );
        })}
        <br />
      </div>
    );
  }

  handleBack = () => {
    return feeStore.goto('account-selection');
  };

  handleSendPayment = () => {
    feeStore.sendPayment();
  };

  handleWhoChange = async (_, { value }) => {
    this.setState({ loading: true, valid: false, reason: null });
    feeStore.setPayer(value);

    try {
      const knownAccount = EthAccounts[value];
      const valid = isValidAddress(value) && !knownAccount;

      if (valid) {
        const { certified } = await backend.checkStatus(value);

        if (certified) {
          return this.setState({ loading: false, valid: false, reason: 'This account is already certified.' });
        }

        return this.setState({ loading: false, valid: true });
      }
    } catch (error) {
      appStore.addError(error);
    }

    this.setState({ loading: false });
  };

  setAddressInputRef = (element) => {
    this.addressInput = element;
  };
}
