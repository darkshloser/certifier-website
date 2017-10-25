import { observer } from 'mobx-react';
import React, { Component } from 'react';
import EthJS from 'ethereumjs-util';
import { Button } from 'semantic-ui-react';

import backend from '../backend';
import { isValidAddress, fromWei } from '../utils';
import appStore from '../stores/app.store';
import feeStore from '../stores/fee.store';

import AppContainer from './AppContainer';
import AddressInput from './AddressInput';
import Text from './ui/Text';
import ViewTransaction from './ui/ViewTransaction';

@observer
export default class Refund extends Component {
  state = {
    accounts: [],
    address: '',
    loaded: false,
    loading: false,
    transaction: null
  };

  componentWillMount () {
    this.init();
  }

  async init () {
    const accounts = await appStore.getAccounts();

    this.setState({ accounts });
  }

  componentWillUnmount () {
    clearInterval(this.intervalId);
  }

  render () {
    const { address, loaded, loading } = this.state;
    const valid = isValidAddress(address);

    return (
      <AppContainer
        hideStepper
        showBack
        title='Ask for a refund'
      >
        <Text.Container>
          <Text>
            Enter the Ethereum address that you whish to be refunded
          </Text>
          <AddressInput
            onChange={this.handleAddressChange}
            value={address}
          />

          {this.renderResult()}

          {
            loaded
              ? null
              : (
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
              )
          }
        </Text.Container>
      </AppContainer>
    );
  }

  renderResult () {
    if (!this.state.loaded) {
      return null;
    }

    const { certified, checkCount } = this.state;

    if (certified) {
      return (
        <Text>
          This address is already certified, congratulations!
          You can use your certified account on any platform
          supporting PICOPS.
        </Text>
      );
    }

    if (checkCount > 0) {
      return (
        <div>
          <Text>
            We registered that {checkCount} check(s) of your
            documents have been intiated for this address.
          </Text>
          <Text>
            We cannot refund this account according to our
            <a href='/#/tc' target='picops-secondary'> Terms and Conditions</a>.
          </Text>
        </div>
      );
    }

    const { paid } = this.state;

    if (!paid) {
      return (
        <div>
          <Text>
            No payment have been received for this address.
          </Text>
        </div>
      );
    }

    const { accounts, matchingAccount } = this.state;

    if (!accounts.length || !matchingAccount) {
      return (
        <div>
          <Text>
            In order to initiate the refund, you must prove
            that your are at the origin of the payment. When PICOPS
            loads for the first time on your machine, we create an account
            for you, that will pay for the fee when the funds are received.
            This account is stored in your browser cache.
          </Text>
          <Text>
            However, it seems that we couldn't find this account in your cache.
            It might be because you are trying to ask for a refund for an address
            you did not pay from this browser; or because you cleared your cache.
          </Text>
          <Text>
            Sadly, there is nothing more we can do about it.
          </Text>
        </div>
      );
    }

    const { loading, transaction } = this.state;

    return (
      <div>
        <Text>
          It seems that you are eligible for a refund, congratulations!
          We can issue a refund of {fromWei(feeStore.fee).toFormat()} ETH to the address above.
        </Text>
        <div style={{ margin: '1.5em 0', textAlign: 'right' }}>
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

    const { accounts } = this.state;

    const lcAddresses = accounts.map((a) => a.address.toLowerCase());
    const matchedOrigin = data.origins.find((origin) => lcAddresses.includes(origin.toLowerCase()));

    if (!matchedOrigin) {
      return data;
    }

    const matchingAccount = accounts.find((a) => a.address.toLowerCase() === matchedOrigin.toLowerCase());
    const message = `I attest I want to get a refund for this address: ${who}`;
    const privateKey = Buffer.from(matchingAccount.secret.slice(2), 'hex');

    const msgHash = EthJS.hashPersonalMessage(EthJS.toBuffer(message));
    const { v, r, s } = EthJS.ecsign(msgHash, privateKey);

    const signature = EthJS.toRpcSig(v, r, s);

    data.message = message;
    data.signature = signature;
    data.matchingAccount = matchingAccount;

    return data;
  }

  handleAddressChange = async (_, { value }) => {
    this.setState({ address: value, loaded: false });
  };

  handleQuery = async () => {
    const { address } = this.state;

    if (isValidAddress(address)) {
      this.setState({ loading: true });

      try {
        const nextState = await this.fetchData(address);

        this.setState(Object.assign({ loaded: true, loading: false }, nextState));
      } catch (error) {
        console.error(error);
        this.setState({ loading: false });
      }
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
    const { address, matchingAccount } = this.state;

    this.intervalId = setInterval(async () => {
      const { status, transaction } = await backend.getRefundStatus({ who: address, origin: matchingAccount.address });

      if (status !== 'sent') {
        return;
      }

      this.setState({ loading: false, transaction });
      clearInterval(this.intervalId);
    }, 2000);
  }
}
