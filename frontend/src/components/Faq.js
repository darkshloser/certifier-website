import copy from 'copy-to-clipboard';
import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { Segment } from 'semantic-ui-react';

import appStore from '../stores/app.store';
import FaqMD from '../faq.md';

import AppContainer from './AppContainer';

export default class Faq extends Component {
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
        header={this.renderGoBack()}
        hideStepper
        footer={this.renderGoBack()}
        style={{ paddingTop: '1em' }}
      >
        <div>
          <Segment vertical>
            <FaqMD />
          </Segment>
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
}
