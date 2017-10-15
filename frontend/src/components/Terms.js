import { observer } from 'mobx-react';
import React, { Component } from 'react';
import { Button, Checkbox, Header, Segment } from 'semantic-ui-react';

import appStore from '../stores/app.store';

import TermsMD from '../terms.md';

@observer
export default class Terms extends Component {
  state = {
    hitBottom: false
  };

  render () {
    const { termsAccepted } = appStore;
    const { hitBottom } = this.state;

    return (
      <Segment basic textAlign='center' style={{ backgroundColor: 'white' }}>
        <Header
          as='h2'
        >
          PICOPS USER TERMS & CONDITIONS
        </Header>
        <div
          style={{
            maxHeight: 350,
            marginBottom: '2em',
            overflow: 'auto',
            textAlign: 'left'
          }}
          ref={this.setTermsRef}
        >
          <TermsMD />
        </div>
        <Checkbox
          disabled={!hitBottom}
          label={`I confirm that I have read and agreed to the Terms & Conditions`}
          checked={termsAccepted}
          onChange={this.handleTermsChecked}
        />

        <br />

        <Button
          disabled={!termsAccepted}
          onClick={this.handleContinue}
          primary
          size='big'
          style={{ marginTop: '2em' }}
        >
          Continue
        </Button>
      </Segment>
    );
  }

  setTermsRef = (element) => {
    if (element) {
      element.addEventListener('scroll', this.handleScroll);
    }
  };

  handleContinue = () => {
    appStore.storeTermsAccepted();
    appStore.goto('country-selection');
  };

  handleScroll = (event) => {
    const { clientHeight, scrollHeight, scrollTop } = event.target;
    const scroll = scrollTop + clientHeight;
    const height = scrollHeight;
    // Precise at +-1%
    const atBottom = Math.abs(scroll - height) / height <= 0.01;

    if (atBottom) {
      this.setState({ hitBottom: true });
      event.target.removeEventListener('scroll', this.handleScroll);
    }
  };

  handleTermsChecked = (_, { checked }) => {
    appStore.setTermsAccepted(checked);
  };
}
