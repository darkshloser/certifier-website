import FileSaver from 'file-saver';
import { observer } from 'mobx-react';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { Button, Form, Grid, Header, Segment } from 'semantic-ui-react';

import { createWallet } from '../utils';
import feeStore from '../stores/fee.store';

import AccountInfo from './AccountInfo';

const RECOVERY_VERIFICATION = 'I have written down my recovery phrase';

const STEPS = [
  'start',
  'password',
  'recovery-write',
  'recovery-repeat',
  'download'
];

@observer
export default class AccountCreator extends Component {
  static propTypes = {
    onCancel: PropTypes.func.isRequired,
    onDone: PropTypes.func.isRequired
  };

  state = {
    password: '',
    passwordRepeat: '',
    recoveryRepeat: '',
    recoveryVerification: '',
    step: 0,
    wallet: null
  };

  valid () {
    const { step } = this.state;

    if (STEPS[step] === 'start') {
      return true;
    }

    if (STEPS[step] === 'password') {
      const { password, passwordRepeat } = this.state;

      if (password.length >= 2 && password === passwordRepeat) {
        return true;
      }
    }

    if (STEPS[step] === 'recovery-write') {
      const { recoveryVerification } = this.state;

      if (recoveryVerification.trim() === RECOVERY_VERIFICATION) {
        return true;
      }
    }

    if (STEPS[step] === 'recovery-repeat') {
      const { recoveryRepeat } = this.state;

      if (recoveryRepeat.trim() === feeStore.wallet.phrase) {
        return true;
      }
    }

    return false;
  }

  render () {
    const { step } = this.state;

    if (STEPS[step] === 'start') {
      return this.renderStart();
    }

    if (STEPS[step] === 'password') {
      return this.renderPassword();
    }

    if (STEPS[step] === 'recovery-write') {
      return this.renderRecoveryWrite();
    }

    if (STEPS[step] === 'recovery-repeat') {
      return this.renderRecoveryRepeat();
    }

    if (STEPS[step] === 'download') {
      return this.renderDownload();
    }

    return null;
  }

  renderDownload () {
    const { wallet } = feeStore;

    return (
      <Grid>
        <Grid.Column width={6}>
          <Header as='h3'>
            WALLET DOWNLOADED - keep it safe!
          </Header>
          <div style={{ lineHeight: '2em' }}>
            <p>
              As you sent the fee for certification from an Exchange,
              we will help you create a new Ethereum Wallet.
            </p>
          </div>
        </Grid.Column>
        <Grid.Column width={10}>
          <Header as='h4'>
            Your ethereum address
          </Header>

          <AccountInfo
            address={wallet.address}
            balance={wallet.balance}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              color='green'
              onClick={this.handleDone}
            >
              Pay the fee
            </Button>

            <Button onClick={this.handleDownload}>
              Download the Wallet
            </Button>
          </div>
        </Grid.Column>
      </Grid>
    );
  }

  renderPassword () {
    const { password, passwordRepeat } = this.state;
    const valid = this.valid();

    return (
      <Grid>
        <Grid.Column width={6}>
          <Header as='h3'>
            CHOOSE YOUR PASSWORD
          </Header>
          <div style={{ lineHeight: '2em' }}>
            <p>
              As you sent the fee for certification from an Exchange,
              we will help you create a new Ethereum Wallet.
            </p>
          </div>
        </Grid.Column>
        <Grid.Column width={10}>
          <Form onSubmit={this.handleNext}>
            <Form.Input
              label='Choose your password'
              id='account-password'
              onChange={this.handlePasswordChange}
              type='password'
              value={password}
            />

            <Form.Input
              label='Repeat your password'
              id='account-repeat-password'
              onChange={this.handlePasswordRepeatChange}
              type='password'
              value={passwordRepeat}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Form.Button
                type='submit'
                primary
                disabled={!valid}
              >
                Next
              </Form.Button>

              <Form.Button onClick={this.handleBack}>
                Back
              </Form.Button>
            </div>
          </Form>
        </Grid.Column>
      </Grid>
    );
  }

  renderRecoveryWrite () {
    const { phrase } = feeStore.wallet;
    const { recoveryVerification } = this.state;
    const valid = this.valid();

    return (
      <Grid>
        <Grid.Column width={6}>
          <Header as='h3'>
            WRITE DOWN YOUR RECOVERY PHRASE
          </Header>
          <div style={{ lineHeight: '2em' }}>
            <p>
              As you sent the fee for certification from an Exchange,
              we will help you create a new Ethereum Wallet.
            </p>
          </div>
        </Grid.Column>
        <Grid.Column width={10}>
          <Header as='h4'>
            Your recovery phrase
          </Header>

          <Segment>
            {phrase}
          </Segment>

          <p>
            Please type “<b>{RECOVERY_VERIFICATION}</b>” into the box below.
          </p>

          <Form onSubmit={this.handleNext}>
            <Form.Input
              onChange={this.handleRecoveryVerificationChange}
              value={recoveryVerification}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Form.Button
                type='submit'
                primary
                disabled={!valid}
              >
                Next
              </Form.Button>

              <Form.Button onClick={this.handleBack}>
                Back
              </Form.Button>
            </div>
          </Form>
        </Grid.Column>
      </Grid>
    );
  }

  renderRecoveryRepeat () {
    const { recoveryRepeat } = this.state;
    const valid = this.valid();

    return (
      <Grid>
        <Grid.Column width={6}>
          <Header as='h3'>
            REPEAT YOUR RECOVERY PHRASE
          </Header>
          <div style={{ lineHeight: '2em' }}>
            <p>
              As you sent the fee for certification from an Exchange,
              we will help you create a new Ethereum Wallet.
            </p>
          </div>
        </Grid.Column>
        <Grid.Column width={10}>
          <Header as='h4'>
            Your recovery phrase
          </Header>

          <Form onSubmit={this.handleNext}>
            <Form.TextArea
              onChange={this.handleRecoveryRepeatChange}
              value={recoveryRepeat}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Form.Button
                type='submit'
                primary
                disabled={!valid}
              >
                Next
              </Form.Button>

              <Form.Button onClick={this.handleBack}>
                Back
              </Form.Button>
            </div>
          </Form>
        </Grid.Column>
      </Grid>
    );
  }

  renderStart () {
    return (
      <Grid>
        <Grid.Column width={8}>
          <Header as='h3'>
            YOU SENT ETHER FROM AN EXCHANGE
          </Header>
          <div style={{ lineHeight: '2em' }}>
            <p>
              As you sent the fee for certification from an Exchange,
              we will help you create a new Ethereum Wallet.
            </p>
            <p>
              At the end of the process, the downloaded file must
              be saved and kept in a safe place, etc.
            </p>
          </div>
        </Grid.Column>
        <Grid.Column width={8}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Button.Group size='huge'>
              <Button onClick={this.handleBack}>Back</Button>
              <Button.Or />
              <Button
                color='green'
                onClick={this.handleNext}
                // style={{ padding: '0.75em 4em' }}
              >
                Continue
              </Button>
            </Button.Group>
          </div>
        </Grid.Column>
      </Grid>
    );
  }

  handleBack = (event) => {
    event.preventDefault();

    if (this.state.step === 0) {
      return this.props.onCancel();
    }

    this.setState({ step: this.state.step - 1 });
  };

  handleDone = () => {
    this.props.onDone(this.state.wallet);
  };

  handleDownload = () => {
    const { wallet } = this.state;
    const blob = new Blob([JSON.stringify(wallet)], { type: 'text/json;charset=utf-8' });

    FileSaver.saveAs(blob, `${wallet.id}.json`);
  };

  handleNext = async (event) => {
    event.preventDefault();

    if (this.state.step === STEPS.length - 1) {
      return;
    }

    if (!this.valid()) {
      return;
    }

    const nextStep = this.state.step + 1;

    if (STEPS[nextStep] === 'download') {
      const { secret } = feeStore.wallet;
      const { password } = this.state;

      const wallet = await createWallet(secret, password);

      this.setState({ wallet }, () => {
        this.handleDownload();
      });
    }

    this.setState({ step: nextStep });
  };

  handlePasswordChange = (_, { value }) => {
    this.setState({ password: value });
  };

  handlePasswordRepeatChange = (_, { value }) => {
    this.setState({ passwordRepeat: value });
  };

  handleRecoveryRepeatChange = (_, { value }) => {
    this.setState({ recoveryRepeat: value });
  };

  handleRecoveryVerificationChange = (_, { value }) => {
    this.setState({ recoveryVerification: value });
  };
}
