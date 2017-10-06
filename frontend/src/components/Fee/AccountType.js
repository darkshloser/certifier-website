import React, { Component } from 'react';
import { Card, Header, Image, Button } from 'semantic-ui-react';

import EthereumBlankImg from '../../images/ethereum_blank.png';
import EthereumImg from '../../images/ethereum.png';
import HardwareImg from '../../images/hardware.svg';
import Step from '../Step';

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
  height: '200px',
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
  constructor (props) {
    super(props);

    this.state = { hardware: false };
  }

  render () {
    if (this.state.hardware) {
      return this.renderHardware();
    }

    return (
      <div>
        <Header as='h2' style={{ color: 'green', textAlign: 'center' }}>
          Certification fee successfully received!
        </Header>
        <p style={{ textAlign: 'center' }}>
          Thank you for your payment.
        </p>
        <Header as='h3' style={{ marginBottom: '1.5em' }}>
          HOW DO YOU WANT TO PROCEED?
        </Header>

        <p style={{ fontSize: '1.15em' }}>
          If you do not currently own an Ethereum wallet (JSON file) to be
          certified and instead store Ether on an exchange, you can now create
          a new Ethereum wallet (JSON file) during the certification process.
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
            <Card onClick={this.handleFromHardwareWallet} style={cardStyle}>
              <div style={imageContainerStyle}>
                <Image src={HardwareImg} style={imageStyle} />
              </div>
              <Card.Content style={cardContentStyle}>
                <Card.Header>
                  Hardware wallet
                </Card.Header>
                <Card.Description>
                  [You've sent Ether from a Hardware wallet]
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
                  My own (existing) wallet will be certified
                </Card.Header>
                <Card.Description>
                  [You own the private key]
                </Card.Description>
              </Card.Content>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  renderHardware () {
    return (
      <Step
        centered
        description={(
          <div>
            <Header as='h4' style={{ marginTop: '1.5em' }}>
              WARNING:
            </Header>
            <p>
              Do not certify a hardware wallet address if you want to participate in an ICO
              for a NON-ERC20 token.
            </p>
            <p>
              Some ICOs are not compatible with hardware wallet addresses!
              Please check the compatibility before using a hardware wallet, or just use a
              JSON wallet file.
            </p>
          </div>
        )}
        title='HARDWARE WALLET'
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <Button.Group size='huge'>
            <Button onClick={this.handleBack}>
              Back
            </Button>
            <Button.Or />
            <Button color='green' onClick={this.handleFromExchange}>
              Create a new JSON wallet file
            </Button>
          </Button.Group>
        </div>
      </Step>
    );
  }

  handleBack = () => {
    this.setState({ hardware: false });
  }

  handleFromHardwareWallet = () => {
    this.setState({ hardware: true });
  }

  handleFromExchange = () => {
    feeStore.goto('from-exchange');
  };

  handleFromPersonal = () => {
    feeStore.goto('from-personal');
  };
}
