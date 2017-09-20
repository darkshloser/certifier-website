import React, { Component } from 'react';

import feeStore from '../../stores/fee.store';

import AccountCreator from '../AccountCreator';

export default class FromExchange extends Component {
  render () {
    return (
      <AccountCreator
        onCancel={this.handleCancel}
        onDone={this.handleDone}
      />
    );
  }

  handleCancel = () => {
    feeStore.goto('account-selection');
  };

  handleDone = (address) => {
    feeStore.setPayer(address);
    feeStore.sendPayment();
  };
}
