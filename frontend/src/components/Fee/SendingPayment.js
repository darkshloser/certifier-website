import React, { Component } from 'react';
import { Button, Header, Loader } from 'semantic-ui-react';

import feeStore from '../../stores/fee.store';

import Step from '../Step';

export default class SendingPayment extends Component {
  componentWillMount () {
    feeStore.watchPayer();
  }

  componentWillUnmount () {
    feeStore.unwatchPayer();
  }

  render () {
    const { transaction } = feeStore;
    const etherscanUrl = 'https://kovan.etherscan.io/tx/' + transaction;

    return (
      <Step
        description={`
          The number of tokens related to the previous contributions
          made before the drop in price will be recalculated and the
          number of tokens allocated to them will be increased to
          match the new lower price.
        `}
        title='RECORDING YOUR PAYMENT ON THE BLOCKCHAIN'
      >
        <div style={{ textAlign: 'center' }}>
          <Loader active inline='centered' size='huge' />

          <Header as='h2' style={{ textTransform: 'uppercase' }}>
            Processing your payment
          </Header>

          <p>
            Please wait until you payment has been recorded on the blockchain.
          </p>

          <Button as='a' href={etherscanUrl} target='_blank' basic>
            View transaction on Etherscan
          </Button>
        </div>
      </Step>
    );
  }
}
