import { observer } from 'mobx-react';
import React, { Component } from 'react';
import { Button, Form, Header, Input } from 'semantic-ui-react';

import backend from '../backend';
import { isValidAddress, fromWei, sha3 } from '../utils';
import config from '../stores/config.store';

import AppContainer from './AppContainer';
import AddressInput from './AddressInput';
import CopyButton from './ui/CopyButton';
import Text from './ui/Text';

const CLAIM_SIGNATURE = sha3('claim(address)').slice(0, 10);

const codeStyle = {
  wordBreak: 'break-word'
};

@observer
export default class Recertification extends Component {
  static initialState = {
    loaded: false,
    loading: false,
    recertifier: null,
    transactions: null,
    sender: '',
    senderCertified: null,
    senderLocked: null,
    status: null,
    valid: false,
    who: '',
    whoCertified: null,
    whoLocked: null
  };

  state = Recertification.initialState;

  componentWillMount () {
    this.init();
  }

  async init () {
    try {
      const { address, fee } = await backend.recertifier();

      this.setState({ recertifier: { address, fee } });
    } catch (error) {
      console.error(error);
    }
  }

  componentWillUnmount () {
  }

  render () {
    const { loading, sender, who } = this.state;

    return (
      <AppContainer
        hideStepper
        showBack
        style={{ padding: '2em 2em' }}
      >
        <div>
          <Header as='h2' style={{ textTransform: 'uppercase' }} textAlign='center'>
            Change your certification address
          </Header>
          <Text.Container>
            <Text>
              <AddressInput
                basic
                disabled={loading}
                label='Your certified Ethereum address'
                onChange={this.handleSenderChange}
                value={sender}
              />
              <AddressInput
                basic
                disabled={loading}
                label='The Ethereum address you wish to certify instead'
                onChange={this.handleWhoChange}
                value={who}
              />
            </Text>

            {this.renderResult()}
          </Text.Container>
        </div>
      </AppContainer>
    );
  }

  renderResult () {
    const { loading, sender, senderCertified, senderLocked, who, whoCertified, whoLocked, valid } = this.state;

    if (valid) {
      const { recertifier, status, transactions } = this.state;

      if (!recertifier) {
        return null;
      }

      if (status === 'error') {
        const { error } = this.state;

        return (
          <div>
            <Text>
              Something went wrong with your recertification.
              Please try again, or contact us.
            </Text>

            <Text>
              <code>{error}</code>
            </Text>

            <div style={{ textAlign: 'center', marginTop: '2.5em' }}>
              <Button primary size='big' onClick={this.handleRestart}>
                Restart
              </Button>
            </div>
          </div>
        );
      }

      if (status === 'success') {
        return (
          <div>
            <Text>
              We successfully certified your new address, after revoking
              the certification for the old one.
            </Text>

            <div style={{ textAlign: 'center', marginTop: '2.5em' }}>
              <Button primary size='big' onClick={this.handleRestart}>
                Restart
              </Button>
            </div>
          </div>
        );
      }

      const data = CLAIM_SIGNATURE + who.slice(-40).padStart(64, 0);
      const etherscanURL = `${config.etherscan}/address/${recertifier.address}`;

      return (
        <div>
          <Text>
            In order to modify the Ethereum address you wish certify,
            you must execute the method <code style={codeStyle}>claim({who})</code> on
            the contract <a href={etherscanURL} target='_blank'><code style={codeStyle}>{recertifier.address}</code></a>.
          </Text>
          <Text>
            A small fee of {fromWei(recertifier.fee).toFormat()} ETH will be asked
            in order to pay for the gas usage of the re-certification.
          </Text>
          <Text>
            Using whichever Ethereum wallet you use (eg. Parity Wallet,
            MyEtherWallet, etc.), please send a transaction with these parameters:
          </Text>

          <Text>
            <AddressInput
              basic
              label='From'
              readOnly
              showCopy
              value={sender}
            />
            <AddressInput
              basic
              label='To'
              readOnly
              showCopy
              value={recertifier.address}
            />
            <Form style={{
              paddingLeft: '5.5em',
              paddingRight: '1em'
            }}>
              <Form.Group>
                <Form.Input
                  action={(<CopyButton value={data} />)}
                  label='Data'
                  readOnly
                  value={data}
                  width={16}
                />
              </Form.Group>
              <Form.Group unstackable widths={2}>
                <Form.Field>
                  <label>Value</label>
                  <Input
                    action={(<CopyButton value={fromWei(recertifier.fee).toString()} />)}
                    readOnly
                    label='ETH'
                    value={fromWei(recertifier.fee).toFormat()}
                  />
                </Form.Field>
                <Form.Field>
                  <label>Value</label>
                  <Input
                    action={(<CopyButton value={recertifier.fee.toString()} />)}
                    readOnly
                    label='WEI'
                    value={recertifier.fee.toFormat()}
                  />
                </Form.Field>
              </Form.Group>
            </Form>

            {
              transactions
                ? this.renderViewTransactions(transactions)
                : null
            }

            <div style={{ textAlign: 'center', marginTop: '2.5em' }}>
              <Button primary size='big' loading={loading} onClick={this.handlePollStatus}>
                I have sent the transaction
              </Button>
            </div>
          </Text>
        </div>
      );
    }

    if (senderCertified === false) {
      return (
        <Text>
          This address <code style={codeStyle}>{sender}</code> is not certified.
          You cannot continue.
        </Text>
      );
    }

    if (whoCertified) {
      return (
        <Text>
          This address <code style={codeStyle}>{who}</code> is already certified.
          You cannot continue.
        </Text>
      );
    }

    if (senderLocked) {
      return (
        <Text>
          This address <code style={codeStyle}>{sender}</code> has already asked for a re-certification.
          You cannot continue.
        </Text>
      );
    }

    if (whoLocked) {
      return (
        <Text>
          This address <code style={codeStyle}>{who}</code> has already asked for a re-certification.
          You cannot continue.
        </Text>
      );
    }

    return null;
  }

  renderViewTransactions (transactions) {
    const { revoke, certify, settle } = transactions;
    const etherscan = config.etherscan;

    return (
      <div style={{ textAlign: 'center', marginTop: '2.5em' }}>
        <Button as='a' href={`${etherscan}/tx/${revoke}`} target='_blank' basic style={{ maring: '0.5em' }}>
          View transaction #1 on Etherscan
        </Button>
        <Button as='a' href={`${etherscan}/tx/${certify}`} target='_blank' basic style={{ maring: '0.5em' }}>
          View transaction #2 on Etherscan
        </Button>
        <Button as='a' href={`${etherscan}/tx/${settle}`} target='_blank' basic style={{ maring: '0.5em' }}>
          View transaction #3 on Etherscan
        </Button>
      </div>
    );
  }

  checkInputs = async () => {
    const { sender, who } = this.state;

    if (!isValidAddress(sender) || !isValidAddress(who)) {
      return;
    }

    this.setState({ loading: true });

    try {
      const { certified: senderCertified } = await backend.checkStatus(sender);

      if (!senderCertified) {
        return this.setState({ senderCertified, loading: false, valid: false });
      }

      const { certified: whoCertified } = await backend.checkStatus(who);

      if (whoCertified) {
        return this.setState({ whoCertified, loading: false, valid: false });
      }

      const senderLocked = await backend.certificationLocked(sender);

      if (senderLocked) {
        return this.setState({ senderLocked, loading: false, valid: false });
      }

      const whoLocked = await backend.certificationLocked(who);

      if (whoLocked) {
        return this.setState({ whoLocked, loading: false, valid: false });
      }

      return this.setState({ valid: true, loading: false });
    } catch (error) {
      console.error(error);
    }

    this.setState({ loading: false });
  };

  async checkStatus () {
    clearTimeout(this.timeoutId);

    const { sender } = this.state;
    const { error, status, transactions } = await backend.checkRecertificationStatus(sender);

    if (status === 'error' || status === 'success') {
      return this.setState({ error, status, transactions, loading: false });
    }

    if (transactions) {
      this.setState({ transactions });
    }

    this.timeoutId = setTimeout(() => this.checkStatus(), 2000);
  }

  handlePollStatus = () => {
    this.setState({ loading: true });
    this.checkStatus();
  };

  handleRestart = () => {
    this.setState(Recertification.initialState);
  };

  handleSenderChange = async (_, { value }) => {
    this.setState({ sender: value, valid: false, loading: false, senderCertified: null, whoCertified: null }, this.checkInputs);
  };

  handleWhoChange = async (_, { value }) => {
    this.setState({ who: value, valid: false, loading: false, senderCertified: null, whoCertified: null }, this.checkInputs);
  };
}
