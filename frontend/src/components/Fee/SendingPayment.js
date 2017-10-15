import { observer } from 'mobx-react';
import React, { Component } from 'react';
import { Header, Loader } from 'semantic-ui-react';

import ViewTransaction from '../ui/ViewTransaction';
import feeStore from '../../stores/fee.store';

@observer
export default class SendingPayment extends Component {
  componentWillMount () {
    feeStore.watchPayer();
  }

  componentWillUnmount () {
    feeStore.unwatchPayer();
  }

  render () {
    const { transaction } = feeStore;

    return (
      <div style={{ textAlign: 'center' }}>
        <Loader active inline='centered' size='huge' />

        <Header as='h2' style={{ textTransform: 'uppercase' }}>
          Processing your order
        </Header>

        <p>
          Please wait until your order has been recorded on the blockchain.
        </p>

        <p>
          This can take several minutes or longer depending on the
          volume of transactions on the Ethereum network.
        </p>

        <ViewTransaction transaction={transaction} />
      </div>
    );
  }
}
