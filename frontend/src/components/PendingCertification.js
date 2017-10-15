import { observer } from 'mobx-react';
import React, { Component } from 'react';
import { Header, Loader } from 'semantic-ui-react';

import AccountInfo from './AccountInfo';
import Step from './Step';
import ViewTransaction from './ui/ViewTransaction';

import certifierStore from '../stores/certifier.store';
import feeStore from '../stores/fee.store';

@observer
export default class PendingCertification extends Component {
  componentWillMount () {
    certifierStore.watchCertification();
  }

  componentWillUnmount () {
    certifierStore.unwatchCertification();
  }

  render () {
    const { payer } = feeStore;
    const { transaction } = certifierStore;

    return (
      <Step
        description={(
          <div>
            <AccountInfo
              address={payer}
              showBalance={false}
            />

            <p>
              This process might take a while...
            </p>
          </div>
        )}
        title='CERTIFYING YOUR IDENTITY'
      >
        <div style={{ textAlign: 'center' }}>
          <Loader active inline='centered' size='huge' />

          <Header as='h2' style={{ textTransform: 'uppercase' }}>
            Processing identity certification
          </Header>

          <p>
            Please wait until your documents are processed and the
            result is saved on the blockchain.
          </p>

          <p><strong>
            This process can take up to several hours, depending on
            the number of people trying to certify at the same time.
          </strong></p>

          <ViewTransaction transaction={transaction} />
        </div>
      </Step>
    );
  }
}
