import React, { Component } from 'react';
import { Button, Header, Loader } from 'semantic-ui-react';

import feeStore from '../../stores/fee.store';

export default class SendingPayment extends Component {
  componentWillMount () {
    feeStore.watchPayer();
  }

  componentWillUnmount () {
    feeStore.unwatchPayer();
  }

  render () {
    const { transaction } = feeStore;
    const etherscanUrl = 'https://etherscan.io/tx/' + transaction;

    return (
      <div style={{ textAlign: 'center' }}>
        <Loader active inline='centered' size='huge' />

        <Header as='h2' style={{ textTransform: 'uppercase' }}>
          Processing your order
        </Header>

        <p>
          Please wait until your order has been recorded on the blockchain.
        </p>

        {
          transaction
            ? (
              <Button as='a' href={etherscanUrl} target='_blank' basic>
                View transaction on Etherscan
              </Button>
            )
            : null
        }
      </div>
    );
  }
}
