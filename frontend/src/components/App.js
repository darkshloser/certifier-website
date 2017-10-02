import { observer } from 'mobx-react';
import React, { Component } from 'react';
import { HashRouter as Router, Link, Route } from 'react-router-dom';
import { Button, Header, Loader } from 'semantic-ui-react';

import AccountInfo from './AccountInfo';
import AppContainer from './AppContainer';
import Certifier from './Certifier';
import CountrySelector from './CountrySelector';
import Details from './Details';
import Fee from './Fee';
import Messages from './Messages';
import Terms from './Terms';

import appStore, { STEPS } from '../stores/app.store';
import feeStore from '../stores/fee.store';
import { parentMessage } from '../utils';

@observer
export default class App extends Component {
  render () {
    return (
      <Router>
        <div data-iframe-height='true'>
          <Route exact path='/' component={MainApp} />
          <Route path='/details' component={Details} />
          <Messages />
        </div>
      </Router>
    );
  }
}

@observer
class MainApp extends Component {
  render () {
    return (
      <AppContainer
        header={this.renderFooter()}
        title='PARITY ICO PASSPORT SERVICE'
      >
        {this.renderContent()}
      </AppContainer>
    );
  }

  renderContent () {
    const { loading, step } = appStore;
    const { payer } = feeStore;

    if (loading) {
      return (
        <div style={{ textAlign: 'center' }}>
          <Loader active inline='centered' size='huge' />

          <Header as='h2'>
            Loading data...
          </Header>
        </div>
      );
    }

    if (step === STEPS['start']) {
      return this.renderStart();
    }

    if (step === STEPS['terms']) {
      return (
        <Terms />
      );
    }

    if (step === STEPS['country-selection']) {
      return (
        <CountrySelector />
      );
    }

    if (step === STEPS['fee']) {
      return (
        <Fee />
      );
    }

    if (step === STEPS['certify']) {
      return <Certifier />;
    }

    if (step === STEPS['certified']) {
      const buttons = appStore.padding
        ? (
          <Button.Group size='big'>
            <Button onClick={this.handleRestart}>Return to start page</Button>
          </Button.Group>
        )
        : (
          <Button.Group size='big'>
            <Button onClick={this.handleRestart}>Return to start page</Button>
            <Button.Or text='or' />
            <Button positive onClick={this.handleReturn}>Return to main website</Button>
          </Button.Group>
        );

      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Header as='h2'>
            YOUR ADDRESS IS NOW CERTIFIED TO YOUR IDENTITY
          </Header>

          <AccountInfo
            address={payer}
          />

          <br />

          { buttons }
        </div>
      );
    }

    return null;
  }

  renderFooter () {
    const { step } = appStore;

    if (step !== STEPS['start']) {
      return null;
    }

    return (
      <div style={{ textAlign: 'right', paddingTop: '0.75em' }}>
        <Link
          to='/details'
          style={{ color: 'gray', fontSize: '1.75em' }}
        >
          Learn More
        </Link>
      </div>
    );
  }

  renderStart () {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Header as='h2'>
          CERTIFICATION PROCESS
        </Header>

        <div style={{
          fontSize: '1em',
          margin: '2em 0 3em',
          maxWidth: '600px'
        }}>
          <p style={{ lineHeight: '1.5em' }}>
            Welcome to the <b>P</b>arity <b>ICO</b> <b>P</b>assport <b>S</b>ervice (PICOPS).
            PICOPS is a two sided service to Ethereum end users that want to support projects
            that offer what has come to be known by the name initial coin offerings (ICOs).
          </p>
          <p style={{ lineHeight: '1.5em' }}>
            PICOPS offers a means to validate that the owner of an Ethereum wallet has passed
            an ID background check stating that they are not part of a restricted set of users
            (e.g. US citizen or individuals on official watchlists). The background check is run
            via a third party, namely Onfido. Parity has set up a smart contract system to record the outcome of the background check on the public Ethereum blockchain, i.e. whitelist a Ethereum addresses that are owned by non-restricted users.
          </p>
          <p style={{ lineHeight: '1.5em' }}>
            To use PICOPS as an end user, you will have to make a small upfront payment of Ether.
            If you do not currently own an Ethereum wallet to be certified and instead store Ether
            on an exchange, you will have the opportunity  to create a wallet file during the
            certification  process. Once the fee is paid, you will be asked to provide a scan
            of a document to <a href='https://onfido.com/'>Onfido</a>,
            an ID verification service, to verify your identity.
          </p>
          <p style={{ lineHeight: '1.5em' }}>
            Processing the payment and verifying your identity document will take a few minutes.
            Please make sure to not close this window during the verification process.
          </p>
        </div>

        <Button primary size='big' onClick={this.handleStart}>
          Start Certification
        </Button>
      </div>
    );
  }

  handleRestart = () => {
    appStore.restart();
  };

  handleReturn = () => {
    parentMessage({
      action: 'close',
      address: feeStore.payer
    });
  };

  handleStart = () => {
    appStore.goto('terms');
  };
}
