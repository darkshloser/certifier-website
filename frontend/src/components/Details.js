import copy from 'copy-to-clipboard';
import React, { Component } from 'react';
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
    agreed: false,
    hitBottomTerms: false,
    understood: false
  };

  render () {
    return (
      <AppContainer
        hideStepper
        style={{ paddingTop: '1em' }}
        showBack
        title='LEARN MORE ABOUT PICOPS'
      >
        <div>
          <Segment vertical>
            <DetailsMD />
          </Segment>
          {this.renderABI()}
        </div>
      </AppContainer>
    );
  }

  renderABI () {
    const { showAbi } = appStore;

    if (!showAbi) {
      return null;
    }

    const { agreed, hitBottomTerms, understood } = this.state;

    return (
      <div>
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

        {
          understood
            ? (
              <div>
                <Segment vertical>
                  <h2>
                    PARITY BACKGROUND - CHECK APPLICATION BINARY INTERFACE
                    <br />
                    TERMS OF USE
                  </h2>
                  <div style={{ height: 400, overflow: 'auto' }} ref={this.setTermsRef}>
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
                    checked={agreed}
                    disabled={!hitBottomTerms}
                    label={(
                      <label style={{ marginLeft: '1em', fontSize: '1.3em' }}>
                        I agree with the terms of use
                      </label>
                    )}
                    onChange={this.handleAgreedChange}
                  />
                </div>
                {this.renderMore()}
              </div>
            )
            : null
        }

      </div>
    );
  }

  renderMore () {
    const { addressCopied, abiCopied, agreed } = this.state;
    const { certifierAddress } = appStore;

    if (!agreed) {
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

  handleAgreedChange = (_, { checked }) => {
    this.setState({ agreed: checked });
  };

  handleUnderstandChange = (_, { checked }) => {
    this.setState({ understood: checked });
  };

  handleScroll = (event) => {
    const { clientHeight, scrollHeight, scrollTop } = event.target;
    const scroll = scrollTop + clientHeight;
    const height = scrollHeight;
    // Precise at +-1%
    const atBottom = Math.abs(scroll - height) / height <= 0.01;

    if (atBottom) {
      this.setState({ hitBottomTerms: true });
      event.target.removeEventListener('scroll', this.handleScroll);
    }
  };

  setTermsRef = (element) => {
    if (element) {
      element.addEventListener('scroll', this.handleScroll);
    }
  };
}
