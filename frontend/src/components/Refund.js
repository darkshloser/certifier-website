import React, { Component } from 'react';
import EthJS from 'ethereumjs-util';
import { Button, Header } from 'semantic-ui-react';

import backend from '../backend';
import { isValidAddress, fromWei } from '../utils';
import appStore from '../stores/app.store';
import feeStore from '../stores/fee.store';

import AppContainer from './AppContainer';
import AddressInput from './AddressInput';
import ViewTransaction from './ui/ViewTransaction';

export default class Refund extends Component {
  state = {
    address: '',
    loaded: false,
    loading: false,
    transaction: null
  };

  componentWillUnmount () {
    clearInterval(this.intervalId);
  }

  render () {
    const { address } = this.state;

    return (
      <AppContainer
        hideStepper
        style={{ textAlign: 'center', padding: '2.5em 1em 2em', maxWidth: '60em', margin: '0 auto' }}
      >
        <div>
          <div style={{ marginBottom: '1.5em' }}>
            <Header as='h4' style={{ textTransform: 'uppercase' }}>
              Enter the Ethereum address that you whish to be refunded
            </Header>
            <AddressInput
              onChange={this.handleAddressChange}
              value={address}
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
    if (!this.state.loaded) {
      return null;
    }

    const contentStyle = { fontSize: '1.25em', margin: '1em 0 1em', lineHeight: '1.5em' };
    const { certified, checkCount } = this.state;

    if (certified) {
      return (
        <div style={contentStyle}>
          This address is certified, congratulations!
        </div>
      );
    }

    if (checkCount > 0) {
      return (
        <div style={contentStyle}>
          <div>
            {checkCount} check(s) have been intiated for
            this address.
          </div>
          <div>
            No refunds can be sent, sorry.
          </div>
        </div>
      );
    }

    const { paid, origins } = this.state;

    if (!paid) {
      return (
        <div style={contentStyle}>
          <div>
            This address has not been paid for.
          </div>
          <div>
            No refunds can be sent, sorry.
          </div>
        </div>
      );
    }

    const { storedPhrase } = this.state;

    if (!storedPhrase) {
      return (
        <div style={contentStyle}>
          <div>
            It seems that your cache has been cleared.
          </div>
          <div>
            There is no way to prove to you are at the origin of
            the fee payment.
          </div>
          <div>
            Please contact us if you think this is a mistake.
          </div>
        </div>
      );
    }

    const { storedAddress } = this.state;

    if (!origins.includes(storedAddress)) {
      return (
        <div style={contentStyle}>
          <div>
            We could not match the origin of the payment with
            the address stored in your browser.
          </div>
          <div>
            Please contact us if you think this is a mistake.
          </div>
        </div>
      );
    }

    const { loading, transaction } = this.state;

    return (
      <div style={contentStyle}>
        <div>
          It seems that you are eligible for a refund, congratulations!
        </div>
        <div>
          We can issue a refund of {fromWei(feeStore.fee).toFormat()} ETH to the address above.
        </div>
        <div style={{ margin: '1.5em 0' }}>
          {
            transaction
              ? (
                <ViewTransaction transaction={transaction} />
              )
              : (
                <Button primary size='big' onClick={this.handleGetRefund} loading={loading}>
                  Get a refund
                </Button>
              )
          }
        </div>
      </div>
    );
  }

  async fetchData (who) {
    const { certified, status, result, reason, error, checkCount, paymentCount } = await backend.checkStatus(who);
    const data = {
      certified, status, result, reason, error, checkCount,
      paymentCount: parseInt(paymentCount)
    };

    if (certified || checkCount > 0) {
      return data;
    }

    const { paid, origins } = await backend.getAccountFeeInfo(who);

    data.paid = paid;
    data.origins = origins.map((add) => add.toLowerCase());

    if (!paid) {
      return data;
    }

    const { storedPhrase } = feeStore;

    data.storedPhrase = storedPhrase;

    if (!storedPhrase) {
      return data;
    }

    const { address: storedAddress, secret: storedSecret } = await feeStore.getWallet();

    data.storedAddress = storedAddress.toLowerCase();

    if (!data.origins.includes(data.storedAddress)) {
      return data;
    }

    const message = `I attest I want to get a refund for this address: ${who}`;
    const privateKey = Buffer.from(storedSecret.slice(2), 'hex');

    const msgHash = EthJS.hashPersonalMessage(EthJS.toBuffer(message));
    const { v, r, s } = EthJS.ecsign(msgHash, privateKey);

    const signature = EthJS.toRpcSig(v, r, s);

    data.message = message;
    data.signature = signature;

    return data;
  }

  handleAddressChange = async (_, { value }) => {
    this.setState({ address: value, loaded: false });

    if (isValidAddress(value)) {
      const nextState = await this.fetchData(value);

      this.setState(Object.assign({ loaded: true }, nextState));
    }
  };

  handleGetRefund = async () => {
    const { message, signature, address } = this.state;

    this.setState({ loading: true });

    try {
      await backend.getRefund({ message, signature, address });
    } catch (error) {
      appStore.addError(error);
    }

    this.pollRefundStatus();
  };

  pollRefundStatus () {
    const { address, storedAddress } = this.state;

    this.intervalId = setInterval(async () => {
      const { status, transaction } = await backend.getRefundStatus({ who: address, origin: storedAddress });

      if (status !== 'sent') {
        return;
      }

      this.setState({ loading: false, transaction });
      clearInterval(this.intervalId);
    }, 2000);
  }
}
