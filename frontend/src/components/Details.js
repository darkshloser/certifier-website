import copy from 'copy-to-clipboard';
import React, { Component } from 'react';
import { Button, Checkbox, Header, Grid, Input, Popup } from 'semantic-ui-react';

import CertifierABI from '../../../backend/src/abis/MultiCertifier.json';
import DetailsMD from '../details.md';

import AppContainer from './AppContainer';

const CERTIFIER_ABI = JSON.stringify(CertifierABI);
const CERTIFIER_ADDRESS = '0x06C4AF12D9E3501C173b5D1B9dd9cF6DCC095b98';

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
        footer={{
          link: '/',
          text: 'Go back'
        }}
        title='LEARN MORE ABOUT PARITY IDENTITY CERTIFICATION'
      >
        <div>
          <DetailsMD />
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

  renderMore () {
    const { addressCopied, abiCopied, understood } = this.state;

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
            value={CERTIFIER_ADDRESS}
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
    copy(CERTIFIER_ADDRESS);

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
