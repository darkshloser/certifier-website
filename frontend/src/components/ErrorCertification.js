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

        <Header as='h4' style={{ whiteSpace: 'pre-line' }}>
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
        <Header as='h4' style={{ whiteSpace: 'pre-line', marginBottom: 0 }}>
          Please try again and make sure you avoid some common mistakes:
        </Header>

        <div style={{ textAlign: 'left', display: 'inline-block' }}>
          <ul>
            <li>
              Ensure your first name and last name are entered exactly as in your document
            </li>
            <li>
              Ensure your documents are valid, i.e., not expired
            </li>
            <li>
              Ensure the document you provide is either a passport, a national ID or a driver’s license
            </li>
          </ul>
        </div>
        <br />
        <br />
        <Button onClick={this.handleTryAgain} basic size='big' color='green'>
          Try again
        </Button>
      </div>
    );
  }

  handleTryAgain = () => {
    certifierStore.init();
  };
}
