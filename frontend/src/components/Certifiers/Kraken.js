import React, { Component } from 'react';
import { Header, Container, Segment } from 'semantic-ui-react';

export default class KrakenCertifier extends Component {
  render () {
    return (
      <Container>
        <Header content='VERIFYING WITH KRAKEN' />
        <Segment basic>
          <p>
            In order to verify your identity with Kraken, please
            follow this <a target='_blank' href='https://kraken.com/'>link</a>.
          </p>
          <p>
            Once the verification is completed, it can take up to a
            few minutes for your account to be verified. Please be patient!
          </p>
        </Segment>
      </Container>
    );
  }
}
