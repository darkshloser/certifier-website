import { observer } from 'mobx-react';
import React, { Component } from 'react';

import feeStore, { STEPS } from '../../stores/fee.store';

import AccountType from './AccountType';
import AlreadyPaid from './AlreadyPaid';
import FromExchange from './FromExchange';
import FromPersonal from './FromPersonal';
import SendingPayment from './SendingPayment';
import WaitingPayment from './WaitingPayment';

@observer
export default class Fee extends Component {
  render () {
    const { step } = feeStore;

    if (step === STEPS['waiting-payment']) {
      return (
        <WaitingPayment />
      );
    }

    if (step === STEPS['account-selection']) {
      return (
        <AccountType />
      );
    }

    if (step === STEPS['from-exchange']) {
      return (
        <FromExchange />
      );
    }

    if (step === STEPS['from-personal']) {
      return (
        <FromPersonal />
      );
    }

    if (step === STEPS['sending-payment']) {
      return (
        <SendingPayment />
      );
    }

    if (step === STEPS['already-paid']) {
      return (
        <AlreadyPaid />
      );
    }

    return null;
  }
}
