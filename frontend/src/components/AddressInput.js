import keycode from 'keycode';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { Input, Segment } from 'semantic-ui-react';

import { isValidAddress } from '../utils';

import AccountIcon from './AccountIcon.js';

export default class AddressInput extends Component {
  static propTypes = {
    onChange: PropTypes.func.isRequired,
    value: PropTypes.string.isRequired,

    onEnter: PropTypes.func
  };

  render () {
    const { value } = this.props;
    const valid = isValidAddress(value);

    return (
      <Segment>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {
            valid
              ? (
                <AccountIcon
                  address={value}
                  style={{ height: 48, marginRight: '1em' }}
                />
              )
              : (
                <span
                  style={{
                    backgroundColor: 'lightgray',
                    borderRadius: '50%',
                    height: '48px',
                    width: '48px',
                    marginRight: '1em'
                  }}
                />
              )
          }

          <div style={{ flex: 1 }}>
            <Input
              fluid
              onChange={this.handleChange}
              onKeyUp={this.handleKeyUp}
              placeholder='0x...'
              ref={this.setInputRef}
              value={value}
            />
          </div>
        </div>
      </Segment>
    );
  }

  handleChange = (e, data) => {
    this.props.onChange(e, data);
  };

  handleKeyUp = (event) => {
    const code = keycode(event);

    if (code === 'enter') {
      this.handleEnter();
    }
  };

  handleEnter = () => {
    const { onEnter } = this.props;

    if (!onEnter) {
      return;
    }

    onEnter();
  };

  focus = () => {
    if (this.input) {
      this.input.focus();
    }
  };

  setInputRef = (element) => {
    this.input = element;
  };
}
