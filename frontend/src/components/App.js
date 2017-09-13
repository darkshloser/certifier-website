import { observer } from 'mobx-react';
import React, { Component } from 'react';
import { Button, Container, Header, Loader, Segment } from 'semantic-ui-react';

import AccountInfo from './AccountInfo';
import Certifier from './Certifier';
import CountrySelector from './CountrySelector';
import Fee from './Fee';
import Terms from './Terms';
// import Stepper from './Stepper';

import appStore, { STEPS } from '../stores/app.store';
import feeStore from '../stores/fee.store';

const contentStyle = {
  backgroundColor: 'white',
  padding: '4em 2.5em'
};

@observer
export default class App extends Component {
  render () {
    const style = {
      textAlign: 'left'
    };

    const { padding } = appStore;

    if (padding) {
      style.paddingBottom = '2em';
      style.paddingTop = '5em';
    }

    const header = padding
      ? <Header as='h4'>PARITY IDENTITY CERTIFICATION</Header>
      : null;

    return (
      <div>
        <Container style={style}>
          {header}
          <Segment basic style={contentStyle}>
            {this.renderContent()}
          </Segment>
        </Container>
      </div>
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
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Header as='h2'>
            YOUR ADDRESS IS NOW CERTIFIED TO YOUR IDENTITY
          </Header>

          <AccountInfo
            address={payer}
          />

          <br />

          <Button.Group size='big'>
            <Button onClick={this.handleRestart}>Certify a new identity</Button>
            <Button.Or text='or' />
            <Button positive>Return to main website</Button>
          </Button.Group>
        </div>
      );
    }

    return null;
  }

  renderStart () {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Header as='h2'>
          CERTIFICATION PROCESS
        </Header>

        <div style={{
          fontSize: '1.15em',
          margin: '2em 0 3em',
          maxWidth: '600px',
          textAlign: 'center'
        }}>
          <p style={{ lineHeight: '1.75em' }}>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum
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

  handleStart = () => {
    appStore.goto('terms');
  };
}
