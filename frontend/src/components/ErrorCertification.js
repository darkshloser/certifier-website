import { observer } from 'mobx-react';
import React, { Component } from 'react';
import { Button, Header } from 'semantic-ui-react';

import AccountInfo from './AccountInfo';

import certifierStore, { ONFIDO_REASONS } from '../stores/certifier.store';
import feeStore from '../stores/fee.store';

@observer
export default class ErrorCertification extends Component {
  render () {
    const { errorReason } = certifierStore;
    const { payer } = feeStore;
    const reason = ONFIDO_REASONS[errorReason];

    return (
      <div style={{ textAlign: 'center' }}>
        <Header as='h2'>
          FAILED TO CERTIFY YOUR IDENTITY
        </Header>

        <AccountInfo
          address={payer}
          showBalance={false}
        />

        <Header as='h3' style={{ whiteSpace: 'pre-line' }}>
          {reason.message}
        </Header>

        {this.renderTryAgain(reason)}
      </div>
    );
  }

  renderTryAgain (reason) {
    if (!reason.retry) {
      return null;
    }

    return (
      <div>
        <br />
        <Button onClick={this.handleTryAgain} basic size='big' color='green'>
          Try again
        </Button>
      </div>
    );
  }

  handleTryAgain = () => {
    certifierStore.setErrorReason(null);
  };
}
