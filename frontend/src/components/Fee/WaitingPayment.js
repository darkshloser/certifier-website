import { observer } from 'mobx-react';
import React, { Component } from 'react';
import { Button, Header, Loader } from 'semantic-ui-react';
import QRCode from 'qrcode.react';

import { fromWei } from '../../utils';

import appStore from '../../stores/app.store';
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
    const feeStyle = {
      padding: '0.1em 0.25em',
      background: '#fff8dd',
      borderRadius: '0.25em'
    };

    return (
      <div>
        <Header
          as='h3'
          textAlign='center'
        >
          PAY THE CERTIFICATION FEE BY SENDING <big style={feeStyle}>{ fromWei(requiredEth).toFormat() } ETH</big> TO:
        </Header>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '1.5em 0 0',
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
              value={wallet.address}
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

          <Button secondary onClick={this.handleCancel}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  handleCancel = () => {
    appStore.restart();
  };
}
