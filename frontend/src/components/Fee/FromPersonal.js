import { observer } from 'mobx-react';
import React, { Component } from 'react';
import { Button, Grid, Header } from 'semantic-ui-react';

import feeStore from '../../stores/fee.store';
import { isValidAddress } from '../../utils';

import AccountInfo from '../AccountInfo';
import AddressInput from '../AddressInput';

@observer
export default class FromPersonal extends Component {
  render () {
    const { payer, incomingChoices = [] } = feeStore;
    const valid = isValidAddress(payer);

    console.log(payer);

    return (
      <div>
        <Header as='h3'>
          YOU SENT ETHER FROM A PERSONAL WALLET
        </Header>
        {this.renderPersonalIncomingChoices(incomingChoices)}
        <p><b>
          Enter the Ethereum address you would like
          to certify
        </b></p>
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
          <Button primary disabled={!valid} onClick={this.handleSendPayment}>
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

    return (
      <div>
        <p>
          <b>
            We have detected incoming transactions from these addresses.
          </b>
          <br />
          If you wish you can use one of those.
        </p>

        {addresses.map((address) => {
          const onClick = () => {
            feeStore.setPayer(address);

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

  handleWhoChange = (_, { value }) => {
    feeStore.setPayer(value);
  };

  setAddressInputRef = (element) => {
    this.addressInput = element;
  };
}
