import { observer } from 'mobx-react';
import React, { Component } from 'react';
import { Header, Loader } from 'semantic-ui-react';
import QRCode from 'qrcode.react';

import { fromWei } from '../../utils';

import feeStore from '../../stores/fee.store';

import AccountInfo from '../AccountInfo';

@observer
export default class WaitingPayment extends Component {
  componentWillMount () {
    feeStore.watchWallet();
  }

  componentWillUnmount () {
    feeStore.unwatchWallet();
  }

  render () {
    const { requiredEth, wallet } = feeStore;

    if (requiredEth === null || wallet === null) {
      return null;
    }

    const link = `web+ethereum:${wallet.address}?value=${requiredEth.toNumber()}&gas=21000`;

    return (
      <div>
        <Header
          as='h3'
          textAlign='center'
        >
          PAY NOW BY SENDING <big>{ fromWei(requiredEth).toFormat() }</big> ETH TO THE
          ADDRESS BELOW
        </Header>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '1.5em 0',
          flexDirection: 'column'
        }}>
          <AccountInfo
            address={wallet.address}
            showCertified={false}
          />

          <br />

          <a href={link}>
            <QRCode
              level='M'
              size={192}
              value={link}
            />
          </a>

          <div style={{
            margin: '1.5em 0',
            color: 'red',
            fontSize: '1.25em',
            display: 'flex'
          }}>
            <Loader active inline size='tiny' style={{ marginRight: '0.5em' }} />
            <span>Waiting for transaction...</span>
          </div>
        </div>
      </div>
    );
  }
}
