import { observer } from 'mobx-react';
import React, { Component } from 'react';
import { Button, Checkbox, Header, Segment } from 'semantic-ui-react';

import appStore from '../stores/app.store';

import TermsMD from '../terms.md';

@observer
export default class Terms extends Component {
  render () {
    const { termsAccepted } = appStore;

    return (
      <Segment basic textAlign='center'>
        <Header
          as='h2'
        >
          TERMS & CONDITIONS
        </Header>
        <Segment basic textAlign='left' style={{
          maxHeight: 350,
          marginBottom: '2em',
          overflow: 'auto'
        }}>
          <TermsMD />
        </Segment>
        <Checkbox
          label={`I confirm that I have read and agreed to the Terms and Conditions`}
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

  handleContinue = () => {
    appStore.storeTermsAccepted();
    appStore.goto('country-selection');
  };

  handleTermsChecked = (_, { checked }) => {
    appStore.setTermsAccepted(checked);
  };
}
