import React, { Component } from 'react';
import { Card, Header, Image } from 'semantic-ui-react';

import EthereumBlankImg from '../../images/ethereum_blank.png';
import EthereumImg from '../../images/ethereum.png';

import feeStore from '../../stores/fee.store';

const rowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  // alignItems: 'center',
  flexWrap: 'wrap'
};

const itemStyle = {
  flex: '1',
  textAlign: 'center',
  display: 'flex',
  justifyContent: 'center',
  padding: '1em'
};

const imageStyle = {
  width: '125px',
  margin: '0 auto'
};

const cardStyle = {
  width: '300px',
  maxWidth: '100%',
  textAlign: 'center'
};

const cardContentStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'column'
};

const imageContainerStyle = {
  background: 'rgba(0,0,0,.05)',
  padding: '1.5em 0',
  width: '100%'
};

export default class AccountType extends Component {
  render () {
    return (
      <div>
        <Header as='h2' style={{ color: 'green', textAlign: 'center' }}>
          Payment received successfully!
        </Header>
        <Header as='h3' style={{ marginBottom: '1.5em' }}>
          HOW DO YOU WANT TO PROCEED?
        </Header>

        <p style={{ fontSize: '1.15em' }}>
          Thank you for the payment.
        </p>

        <p style={{ fontSize: '1.15em' }}>
          If you do not currently own an Ethereum wallet (JSON file) to be
          certified and instead store Ether on an exchange, you will have the
          opportunity to create a JSON wallet file during the certification process.
        </p>

        <p style={{ fontSize: '1.15em', fontWeight: 'bold' }}>
          Please be sure not to certify an Ethereum address
          from an exchange!
        </p>

        <div style={rowStyle}>
          <div style={itemStyle}>
            <Card onClick={this.handleFromExchange} style={cardStyle}>
              <div style={imageContainerStyle}>
                <Image src={EthereumBlankImg} style={imageStyle} />
              </div>
              <Card.Content style={cardContentStyle}>
                <Card.Header>
                  Create a new wallet to be certified
                </Card.Header>
                <Card.Description>
                  [This will be your personal wallet]
                </Card.Description>
              </Card.Content>
            </Card>
          </div>

          <div style={itemStyle}>
            <Card onClick={this.handleFromPersonal} style={cardStyle}>
              <div style={imageContainerStyle}>
                <Image src={EthereumImg} style={imageStyle} />
              </div>
              <Card.Content style={cardContentStyle}>
                <Card.Header>
                  My own existing wallet will be certified
                </Card.Header>
                <Card.Description>
                  [I own the private key]
                </Card.Description>
              </Card.Content>
            </Card>
          </div>
        </div>
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
