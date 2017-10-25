import { observer } from 'mobx-react';
import React, { Component } from 'react';
import { HashRouter as Router, Route } from 'react-router-dom';
import { Button, Header, Icon, Loader, Popup } from 'semantic-ui-react';

import AccountInfo from './AccountInfo';
import AppContainer from './AppContainer';
import Certifier from './Certifier';
import Check from './Check';
import CheckRefund from './CheckRefund';
import CountrySelector from './CountrySelector';
import CountrySelectionWrapper from './CountrySelectionWrapper';
import Details from './Details';
import Help from './Help';
import Fee from './Fee';
import Faq from './Faq';
import Messages from './Messages';
import Recertification from './Recertification';
import Refund from './Refund';
import Terms from './Terms';
import TermsView from './TermsView';
import Transfer from './Transfer';

import appStore, { STEPS } from '../stores/app.store';
import feeStore from '../stores/fee.store';
import { parentMessage } from '../utils';

@observer
export default class App extends Component {
  render () {
    return (
      <Router>
        <div data-iframe-height='true'>
          <div>
            <Route exact path='/' component={MainApp} />
            <Route path='/details' component={Details} />
            <Route path='/help' component={Help} />
            <Route path='/tc' component={TermsView} />
            <Route path='/faq' component={Faq} />
            <Route path='/check' component={Check} />
            <Route path='/refund' component={Refund} />
            <Route path='/transfer' component={Transfer} />
            <Route path='/check-refund' component={CheckRefund} />
            <Route path='/country-selection' component={CountrySelectionWrapper} />
            <Route path='/recertification' component={Recertification} />
            <Messages />
          </div>
        </div>
      </Router>
    );
  }
}

@observer
class MainApp extends Component {
  componentWillMount () {
    if (window.name !== 'picops-main') {
      window.name = 'picops-main';
    }
  }

  render () {
    return (
      <AppContainer
        action={this.renderAction()}
        title='PARITY ICO PASSPORT SERVICE'
        style={{ padding: '2em 1.5em' }}
      >
        {this.renderHelp()}
        {this.renderContent()}
      </AppContainer>
    );
  }

  renderHelp () {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        right: 0,
        padding: '1em'
      }}>
        <Popup
          trigger={(
            <Button
              as='a'
              circular
              href='/#/help'
              target='picops-secondary'
              style={{
                padding: '0.75em 1em',
                backgroundColor: 'white',
                boxShadow: '0 0 1px 0px black inset, 0 0 1px 0px black',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Icon name='help' size='large' style={{ height: 'auto', marginRight: '0.2em' }} />
              <span style={{ fontSize: '1.2em' }}>
                Help
              </span>
            </Button>
          )}
          content='If you have any questions or issues, click here to go to the help center.'
        />
      </div>
    );
  }

  renderContent () {
    const { loading, step } = appStore;
    const { payer } = feeStore;

    if (loading) {
      return (
        <div style={{ textAlign: 'center', padding: '2em 0' }}>
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

  renderAction () {
    const { step } = appStore;

    if (step !== STEPS['start']) {
      return;
    }

    return {
      text: 'Learn More',
      href: '/#/details',
      position: 'top'
    };
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
            PICOPS is a service for users of the Ethereum network that want to support projects
            offering what has come to be known by the name <em>Initial Coin Offerings (ICOs)</em>.
          </p>
          <p style={{ lineHeight: '1.5em' }}>
            PICOPS offers a means to validate that the owner of an Ethereum wallet has passed
            an ID background check stating that they are not part of a restricted set of users
            (e.g. US citizen or individuals on official watchlists). The background check is run
            via a third party, namely <a href='https://onfido.com/' target='_blank'>Onfido</a>.
            Parity Technologies has set up a smart contract system to record the outcome of the
            background check on the public Ethereum blockchain, i.e. whitelist Ethereum addresses
            that are owned by non-restricted users.
          </p>
          <h3>PROCESS</h3>
          <ul>
            <li>
              To use PICOPS as a user, you will have to agree to the Terms of Use and make a small
              upfront payment in Ether.
            </li>
            <li>
              You need to provide your own personal Ethereum wallet address that you wish to 'whitelist'.
              If you don’t have an own personal Ethereum wallet and instead store Ether on an exchange,
              we will help you to create a personal wallet file during the certification process.
            </li>
            <li>
              Once the fee is paid, you will be asked to provide a scan of an identification document
              (passport, drivers license, ID) to Onfido’s ID verification service to verify your identity.
            </li>
            <li>
              Processing the payment and verifying your identity document will take a few minutes. Please
              make sure to keep this window open during the verification process.
            </li>
          </ul>
        </div>

        <div>
          <Button secondary size='big' as='a' href='/#/check'>
            Check Certification
          </Button>

          <Button primary size='big' onClick={this.handleStart}>
            Start Certification
          </Button>
        </div>
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
