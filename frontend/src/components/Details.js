import copy from 'copy-to-clipboard';
import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { Button, Checkbox, Header, Grid, Input, Popup, Segment } from 'semantic-ui-react';

import appStore from '../stores/app.store';
import CertifierABI from '../../../backend/src/abis/MultiCertifier.json';
import DetailsMD from '../details.md';
import TermsOfUseMD from '../terms-of-use.md';

import AppContainer from './AppContainer';

const CERTIFIER_ABI = JSON.stringify(CertifierABI);

export default class Details extends Component {
  state = {
    abiCopied: false,
    addressCopied: false,
    understood: false
  };

  render () {
    const { understood } = this.state;

    return (
      <AppContainer
        header={this.renderGoBack()}
        footer={this.renderGoBack()}
        style={{ paddingTop: '1em' }}
        title='LEARN MORE ABOUT PICOPS'
      >
        <div>
          <Segment vertical>
            <DetailsMD />
          </Segment>

          <Segment vertical>
            <h2>
              PARITY BACKGROUND - CHECK APPLICATION BINARY INTERFACE
              <br />
              TERMS OF USE
            </h2>
            <div style={{ height: 400, overflow: 'auto' }}>
              <TermsOfUseMD />
            </div>
          </Segment>

          <div style={{
            alignItems: 'center',
            display: 'flex',
            justifyContent: 'center',
            margin: '2em 0 1em'
          }}>
            <Checkbox
              checked={understood}
              label={(
                <label style={{ marginLeft: '1em', fontSize: '1.3em' }}>
                  I understand the above statement
                </label>
              )}
              onChange={this.handleUnderstandChange}
            />
          </div>
          {this.renderMore()}
        </div>
      </AppContainer>
    );
  }

  renderGoBack () {
    return (
      <div style={{ textAlign: 'right', paddingTop: '0.75em' }}>
        <Link
          to='/'
          style={{ color: 'gray', fontSize: '1.75em' }}
        >
          Go Back
        </Link>
      </div>
    );
  }

  renderMore () {
    const { addressCopied, abiCopied, understood } = this.state;
    const { certifierAddress } = appStore;

    if (!understood) {
      return null;
    }

    const input = (
      <input
        style={{
          backgroundColor: '#fdf6e3',
          color: '#002b36',
          height: '3.5em',
          fontFamily: 'monospace'
        }}
      />
    );

    return (
      <Grid style={{ marginTop: '1.5em' }}>
        <Grid.Column width={8}>
          <Header as='h4' textAlign='center'>
            CERTIFIER ADDRESS
          </Header>

          <Input
            action
            fluid
            readOnly
            value={certifierAddress}
          >
            {input}
            <Popup
              trigger={<Button color='blue' disabled={addressCopied} icon='copy' onClick={this.handleCopyAddress} />}
              content='Copied!'
              on='click'
              open={addressCopied}
              position='top right'
            />
          </Input>
        </Grid.Column>
        <Grid.Column width={8}>
          <Header as='h4' textAlign='center'>
            CERTIFIER ABI
          </Header>

          <Input
            action
            fluid
            readOnly
            value={CERTIFIER_ABI}
          >
            {input}
            <Popup
              trigger={<Button color='blue' disabled={abiCopied} icon='copy' onClick={this.handleCopyABI} />}
              content='Copied!'
              on='click'
              open={abiCopied}
              position='top right'
            />
          </Input>
        </Grid.Column>
      </Grid>
    );
  }

  handleCopyAddress = () => {
    copy(appStore.certifierAddress);

    this.setState({ addressCopied: true });

    setTimeout(() => {
      this.setState({ addressCopied: false });
    }, 1500);
  };

  handleCopyABI = () => {
    copy(CERTIFIER_ABI);

    this.setState({ abiCopied: true });

    setTimeout(() => {
      this.setState({ abiCopied: false });
    }, 1500);
  };

  handleUnderstandChange = (_, { checked }) => {
    this.setState({ understood: checked });
  };
}
