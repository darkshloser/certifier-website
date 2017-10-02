import { phraseToWallet } from '@parity/ethkey.js';
import { randomPhrase } from '@parity/wordlist';
import FileSaver from 'file-saver';
import { observer } from 'mobx-react';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { Button, Form, Grid, Header, Segment } from 'semantic-ui-react';

import appStore from '../stores/app.store';
import { createWallet } from '../utils';
import Step from './Step';

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
    jsonWallet: null,
    wallet: null
  };

  componentWillMount () {
    this.generateWallet()
      .catch((error) => {
        appStore.addError(error);
      });
  }

  async generateWallet () {
    const phrase = randomPhrase(12);
    const { address, secret } = await phraseToWallet(phrase);
    const wallet = { address, secret, phrase };

    this.setState({ wallet });
  }

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

      if (recoveryRepeat.trim() === this.state.wallet.phrase) {
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
    const { wallet } = this.state;

    return (
      <Grid>
        <Grid.Column width={6}>
          <Header as='h3'>
            WALLET DOWNLOADED - keep it safe!
          </Header>
          <div style={{ lineHeight: '2em' }}>
            <p>
              You have now created a new Ethereum wallet - it will
              download automatically.
            </p>
            <p>
              This file contains the key to your newly created Ethereum
              account that you will certify.
              Store it somewhere safe, and <b>DO NOT LOSE IT</b>.
            </p>
          </div>
        </Grid.Column>
        <Grid.Column width={10}>
          <Header as='h4' style={{ marginBottom: '0' }}>
            Your ethereum address
          </Header>

          <AccountInfo
            address={wallet.address}
            showCertified={false}
            showBalance={false}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1em' }}>
            <Button onClick={this.handleDownload}>
              Download the Wallet
            </Button>

            <Button
              color='green'
              onClick={this.handleDone}
            >
              Process the order
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
            CHOOSE YOUR WALLET PASSWORD
          </Header>
          <div style={{ lineHeight: '2em' }}>
            <p>
              Choose a unique and secure password. Write it down and
              keep it safe. You will need it to unlock access to your wallet.
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
              <Form.Button type='button' onClick={this.handleBack}>
                Back
              </Form.Button>

              <Form.Button
                type='submit'
                primary
                disabled={!valid}
              >
                Next
              </Form.Button>
            </div>
          </Form>
        </Grid.Column>
      </Grid>
    );
  }

  renderRecoveryWrite () {
    const { phrase } = this.state.wallet;
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
              You will need this for the next step.
            </p>
            <p>
              <b>WRITE IT DOWN</b> and keep it secret and safe.
              Everyone who has access to this phrase will be able
              to access your account, without any password.
            </p>
            <p>
              Should you lose your password and/or
              JSON wallet file, your recovery phrase will restore access to
              your wallet.
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
              <Form.Button type='button' onClick={this.handleBack}>
                Back
              </Form.Button>

              <Form.Button
                type='submit'
                primary
                disabled={!valid}
              >
                Next
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
              We were serious when we reminded you to write down your
              recovery phrase. Please repeat your recovery phrase
              in the box to the right.
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
              <Form.Button type='button' onClick={this.handleBack}>
                Back
              </Form.Button>

              <Form.Button
                type='submit'
                primary
                disabled={!valid}
              >
                Next
              </Form.Button>
            </div>
          </Form>
        </Grid.Column>
      </Grid>
    );
  }

  renderStart () {
    return (
      <Step
        centered
        description={(
          <div>
            <p>
              We will generate a new wallet file for you.
            </p>
            <p>
              This is a password-encrypted key to your new Ethereum
              account that you will certify through PICOPS.
            </p>
          </div>
        )}
        title='GENERATE A NEW WALLET FILE'
      >
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
      </Step>
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
    this.props.onDone(this.state.wallet.address);
  };

  handleDownload = () => {
    const { jsonWallet } = this.state;
    const blob = new Blob([JSON.stringify(jsonWallet)], { type: 'text/json;charset=utf-8' });

    FileSaver.saveAs(blob, `${jsonWallet.id}.json`);
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
      const { secret } = this.state.wallet;
      const { password } = this.state;

      const jsonWallet = await createWallet(secret, password);

      this.setState({ jsonWallet }, () => {
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
