import BigNumber from 'bignumber.js';
import React, { Component } from 'react';
import { Button, Checkbox, Form, Header, Loader, Message, Modal, Icon, Input } from 'semantic-ui-react';

import backend from '../backend';
import config from '../stores/config.store';
import { fromWei, isValidAddress, toWei } from '../utils';
import appStore from '../stores/app.store';
import Transaction from '../stores/transaction';

import AppContainer from './AppContainer';
import AddressInput from './AddressInput';
import AccountInfo from './AccountInfo';
import Text from './ui/Text';
import ViewTransaction from './ui/ViewTransaction';

const GAS_LIMIT = new BigNumber(21000);

export default class Transfer extends Component {
  state = {
    accounts: [],
    deleting: null,
    data: '',
    error: null,
    gasLimit: GAS_LIMIT,
    gasModified: false,
    minGasLimit: GAS_LIMIT,
    loading: true,
    receipient: '',
    sender: null,
    sending: false,
    showAdvanced: false,
    transaction: null,
    value: 0
  };

  componentWillMount () {
    this.init().catch((error) => appStore.addError(error));
  }

  async init () {
    this.setState({ loading: true });

    const accounts = await appStore.getAccounts();

    this.setState({
      accounts,
      loading: false,
      sender: accounts.length > 0 ? accounts[0] : null
    });
  }

  render () {
    return (
      <AppContainer
        hideStepper
        showBack
        title='Transfer your funds'
      >
        {this.renderContent()}
      </AppContainer>
    );
  }

  renderContent () {
    const { accounts, receipient, loading, sending, sender, transaction } = this.state;

    if (loading) {
      return (
        <Loader />
      );
    }

    if (accounts.length === 0) {
      return (
        <Text.Container>
          <Text>
            No accounts have been found. It might be because you cleared your cache,
            and there is nothing we can do about it, sadly...
          </Text>
        </Text.Container>
      );
    }

    const { deleting, data, error, gasLimit, minGasLimit, showAdvanced, value } = this.state;

    const validReceipient = isValidAddress(receipient) && (receipient.toLowerCase() !== sender.address.toLowerCase());
    const validGasLimit = gasLimit.gte(minGasLimit);
    const validData = !data || /^0x[0-9a-f]*$/i.test(data);

    const valid = validData && validGasLimit && validReceipient;

    return (
      <Text.Container>
        <Text>
          You can transfer funds from the accounts we created for you if any are left.
          Please select the sender and the receiver of the transaction.
        </Text>
        {this.renderAccountSelection()}
        <Header as='h4'>
          Enter the transfer parameters
        </Header>

        <AddressInput
          basic
          label='To'
          onChange={this.handleAddressChange}
          value={receipient}
        />

        <Form style={{
          paddingLeft: '5.5em',
          paddingRight: '1em'
        }}>
          {
            showAdvanced
              ? (
                <Form.Group>
                  <Form.Input
                    error={!validData}
                    label='Data (optional)'
                    onChange={this.handleDataChange}
                    placeholder='0x...'
                    value={data}
                    width={16}
                  />
                </Form.Group>
              )
              : null
          }
          <Form.Group>
            <Form.Field>
              <label>Value</label>
              <Input
                label='ETH'
                onChange={this.handleValueChange}
                value={value}
                type='number'
                min={0}
              />
            </Form.Field>
            {
              showAdvanced
                ? (
                  <Form.Field error={!validGasLimit}>
                    <label>Gas Limit</label>
                    <Input
                      label='wei'
                      onChange={this.handleGasLimitChange}
                      value={gasLimit.toNumber()}
                      type='number'
                      min={minGasLimit.toNumber()}
                    />
                  </Form.Field>
                )
                : null
            }
          </Form.Group>

          <div>
            <br />
            <Checkbox
              checked={showAdvanced}
              label='Advanced settings'
              onChange={this.handleAdvancedChange}
            />
          </div>

          {
            error
              ? (
                <Message negative>
                  <p>{error.message}</p>
                </Message>
              )
              : null
          }
        </Form>

        <div style={{ margin: '1em 0 0', textAlign: 'right' }}>
          {
            transaction
              ? (
                <ViewTransaction transaction={transaction} />
              )
              : null
          }
          <Button disabled={!valid} primary size='big' onClick={this.handleSend} loading={sending}>
            Send
          </Button>
        </div>

        <Modal open={!!deleting} onClose={this.handleCancelDelete} basic size='small'>
          <Header icon='trash' content='Delete old Ethereum account' />
          <Modal.Content>
            <p>
              Do you really want to delete this account? Once deleted, any funds sent to it
              will be stuck in the account forever!
            </p>
          </Modal.Content>
          <Modal.Actions>
            <Button basic color='red' inverted onClick={this.handleCancelDelete}>
              <Icon name='remove' /> No
            </Button>
            <Button color='green' inverted onClick={this.handleDelete}>
              <Icon name='checkmark' /> Yes
            </Button>
          </Modal.Actions>
        </Modal>
      </Text.Container>
    );
  }

  renderAccountSelection () {
    const { accounts } = this.state;

    return (
      <div>
        {accounts.map((account) => this.renderAccount(account))}
      </div>
    );
  }

  renderAccount (account) {
    const { sender } = this.state;
    const selected = sender.address === account.address;

    const onClick = () => {
      this.setState({ sender: account });
    };

    const onDelete = () => {
      this.setState({ deleting: account });
    };

    return (
      <div key={account.address} style={{
        display: 'flex',
        alignItems: 'center',
        margin: '0.5em 0 1em 1em'
      }}>
        <Button disabled={account.current} circular icon='trash' color='red' size='small' onClick={onDelete} />
        <AccountInfo
          address={account.address}
          onClick={onClick}
          showCertified={false}
          style={{
            border: selected ? '1px solid black' : 'none',
            cursor: 'pointer',
            margin: '0 0.5em'
          }}
        />
      </div>
    );
  }

  handleCancelDelete = () => {
    this.setState({ deleting: null });
  };

  handleAdvancedChange = (_, { checked }) => {
    this.setState({ showAdvanced: checked });
  };

  handleAddressChange = async (_, { value }) => {
    this.setState({ receipient: value });
  };

  handleDataChange = (_, { value }) => {
    const validData = !value || /^0x[0-9a-f]*$/i.test(value);
    // Add at least 68 wei of gas for every byte of data
    const minGasLimit = validData
      ? GAS_LIMIT.add(Math.ceil(Math.max((value.length - 2), 0) / 2) * 68)
      : GAS_LIMIT;

    const nextState = {
      data: value,
      minGasLimit
    };

    // Modify gas limit accrodingly if it hasn't been
    // touched yet
    if (!this.state.gasModified) {
      nextState.gasLimit = minGasLimit;
    }

    this.setState(nextState);
  };

  handleDelete = async () => {
    const account = this.state.deleting;

    this.setState({ deleting: null });
    await appStore.deleteAccount(account.phrase);
    this.init();
  };

  handleGasLimitChange = (_, { value }) => {
    this.setState({ gasLimit: new BigNumber(value), gasModified: true });
  };

  handleValueChange = (_, { value }) => {
    this.setState({ value });
  };

  handleSend = async () => {
    this.setState({ error: null, sending: true, transaction: null });

    try {
      const { data, gasLimit, receipient, sender, value } = this.state;

      const { balance } = await backend.getAccountFeeInfo(sender.address);
      const gasPrice = config.get('gasPrice');
      const totalGas = gasLimit.mul(gasPrice);

      if (balance.lt(totalGas)) {
        throw new Error(`Not enough funds to send a transaction, missing ${fromWei(totalGas.sub(balance))} ETH...`);
      }

      const maxValue = balance.sub(totalGas);
      const weiValue = toWei(value);

      const transaction = new Transaction(sender.secret);
      const { hash } = await transaction.send({
        data: data || '',
        gasLimit: gasLimit,
        to: receipient,
        value: maxValue.lt(weiValue) ? maxValue : weiValue
      });

      console.warn('sent tx', hash);
      this.setState({ sending: false, transaction: hash });
    } catch (error) {
      console.error(error);
      this.setState({ error, sending: false });
    }
  };
}
