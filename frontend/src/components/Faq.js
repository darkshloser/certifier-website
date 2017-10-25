import React, { Component } from 'react';
import { Segment } from 'semantic-ui-react';

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
        hideStepper
        showBack
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
}
