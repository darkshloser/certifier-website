import { observer } from 'mobx-react';
import React, { Component } from 'react';
import { Button, Message } from 'semantic-ui-react';

import backend from '../../backend';
import feeStore from '../../stores/fee.store';
import { isValidAddress } from '../../utils';

import AddressInput from '../AddressInput';
import Step from '../Step';

const HAS_NOT_PAID_ERROR = new Error('This address has not paid for the fee yet.');

@observer
export default class AlreadyPaid extends Component {
  state = {
    error: null,
    loading: false,
    valid: false
  };

  render () {
    const { error, valid, loading } = this.state;
    const { payer } = feeStore;

    return (
      <Step
        description={`
          The number of tokens related to the previous contributions
          made before the drop in price will be recalculated and the
          number of tokens allocated to them will be increased to
          match the new lower price.
        `}
        title='YOU ALREADY PAID FOR THE FEE'
      >
        <div>
          <p><b>
            Enter the Ethereum address you used to pay for the fee
          </b></p>

          { this.renderError(error) }

          <AddressInput
            onChange={this.handleWhoChange}
            onEnter={this.handleCheckPayment}
            value={payer}
          />

          <div style={{ textAlign: 'right' }}>
            <Button secondary onClick={this.handleBack}>
              Back
            </Button>
            <Button
              primary
              disabled={!valid}
              loading={loading}
              onClick={this.handleCheckPayment}
            >
              Next
            </Button>
          </div>
        </div>
      </Step>
    );
  }

  renderError (error) {
    if (error === null) {
      return null;
    }

    return (
      <Message negative>
        {error.message}
      </Message>
    );
  }

  handleBack = () => {
    feeStore.setPayer('');
    return feeStore.goto('waiting-payment');
  };

  handleCheckPayment = async () => {
    const hasPaid = await feeStore.checkPayer();

    if (!hasPaid) {
      this.setState({ error: HAS_NOT_PAID_ERROR });
    }
  };

  handleWhoChange = async (_, { value }) => {
    feeStore.setPayer(value);

    if (this.state.error) {
      this.setState({ error: null });
    }

    if (isValidAddress(value)) {
      this.setState({ loading: true });
      const nextState = { loading: false };

      try {
        const { paid } = await backend.getAccountFeeInfo(value);

        if (!paid) {
          throw HAS_NOT_PAID_ERROR;
        }

        nextState.valid = true;
      } catch (error) {
        nextState.error = error;
        nextState.valid = false;
      }

      this.setState(nextState);
    } else if (this.state.valid) {
      this.setState({ valid: false });
    }
  };
}
