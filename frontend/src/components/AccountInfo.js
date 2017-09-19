import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Segment } from 'semantic-ui-react';

import backend from '../backend';
import { fromWei, toChecksumAddress } from '../utils';

import AccountIcon from './AccountIcon.js';

export default class AccountInfo extends Component {
  static propTypes = {
    address: PropTypes.string.isRequired,
    showBalance: PropTypes.bool,
    showCertified: PropTypes.bool,
    onClick: PropTypes.func
  };

  static defaultProps = {
    showBalance: true,
    showCertified: true
  };

  state = {
    balance: null,
    certified: null
  };

  componentWillMount () {
    this.fetchInfo();
  }

  componentWillReceiveProps (nextProps) {
    if (nextProps.address !== this.props.address) {
      this.fetchInfo(nextProps);
    }
  }

  async fetchInfo (props = this.props) {
    const { address, showBalance, showCertified } = props;

    const nextState = {};

    if (showBalance) {
      const { balance } = await backend.getAccountFeeInfo(address);

      nextState.balance = balance;
    }

    if (showCertified) {
      const { certified } = await backend.checkStatus(address);

      nextState.certified = certified;
    }

    this.setState(nextState);
  }

  render () {
    const { address: _address, onClick, showBalance, showCertified } = this.props;
    const { certified } = this.state;

    const address = toChecksumAddress(_address);

    const style = {
      padding: '0.75em 1em 0.75em 0.5em',
      display: 'inline-block',
      maxWidth: '100%'
    };

    if (onClick) {
      style.cursor = 'pointer';
    }

    if (certified !== null) {
      style.color = certified
        ? 'green'
        : 'grey';
    }

    return (
      <Segment compact style={style} onClick={onClick}>
        <div style={{ display: 'flex', maxWidth: '100%' }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-around',
            marginRight: '1em',
            flex: '0 0 auto'
          }}>
            <AccountIcon
              address={address}
              style={{ height: 48 }}
            />
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-around',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <span style={{
              fontFamily: 'monospace',
              fontSize: '1.0em',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {address}
            </span>
            {
              showCertified || showBalance
                ? (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-between'
                  }}>
                    {this.renderBalance()}
                    {this.renderCertified()}
                  </div>
                )
                : null
            }
          </div>
        </div>
      </Segment>
    );
  }

  renderBalance () {
    const { showBalance } = this.props;
    const { balance } = this.state;

    if (!balance || !showBalance) {
      return <span />;
    }

    return (
      <span>
        Current funds: {fromWei(balance).toFormat()} ETH
      </span>
    );
  }

  renderCertified () {
    const { showCertified } = this.props;
    const { certified } = this.state;

    if (certified === null || !showCertified) {
      return null;
    }

    const color = certified
      ? 'green'
      : 'grey';

    const style = {
      borderColor: color,
      borderRadius: '1em',
      borderStyle: 'solid',
      borderWidth: '2px',
      color: color,
      fontSize: '0.85em',
      fontWeight: 'bold',
      padding: '0em 0.5em',
      marginLeft: '0.5em',
      lineHeight: '1.75em'
    };

    return (
      <div style={style}>
        { certified ? 'Address certified' : 'Not yet certified' }
      </div>
    );
  }
}
