import React, { Component } from 'react';
import { Card, Grid, Header, Image } from 'semantic-ui-react';

import ExchangeImg from '../../images/exchange.png';
import EthereumImg from '../../images/ethereum.png';

import feeStore from '../../stores/fee.store';

export default class AccountType extends Component {
  render () {
    return (
      <div>
        <Header as='h3'>
          HOW DID YOU SEND ETHER?
        </Header>
        <Card.Group itemsPerRow={2}>
          <Card onClick={this.handleFromExchange}>
            <Image src={ExchangeImg} />
            <Card.Content>
              <Card.Header>
                From an exchange
              </Card.Header>
              <Card.Description>
                You sent some ETH from an exchange
                as Kraken, Coinbase, etc.
              </Card.Description>
            </Card.Content>
          </Card>

          <Card onClick={this.handleFromPersonal}>
            <Image src={EthereumImg} />
            <Card.Content>
              <Card.Header>
                From a personal Wallet
              </Card.Header>
              <Card.Description>
                You sent some ETH from a Wallet you
                have full access too, using Parity Wallet,
                MyEtherWallet, etc.
              </Card.Description>
            </Card.Content>
          </Card>
        </Card.Group>
      </div>
    );
  }

  handleFromExchange = () => {
    feeStore.goto('from-exchange');
  };

  handleFromPersonal = () => {
    feeStore.goto('from-personal');
  };
}
