import keycode from 'keycode';
import { omit } from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { Form, Input, Segment } from 'semantic-ui-react';

import { isValidAddress } from '../utils';

import AccountIcon from './AccountIcon';
import CopyButton from './ui/CopyButton';

let id = 0;

export default class AddressInput extends Component {
  static propTypes = {
    onChange: PropTypes.func.isRequired,
    value: PropTypes.string.isRequired,

    basic: PropTypes.bool,
    label: PropTypes.string,
    onEnter: PropTypes.func,
    showCopy: PropTypes.bool
  };

  static defaultProps = {
    showCopy: false
  };

  componentWillMount () {
    id++;
  }

  static defaultProps = {
    basic: false
  };

  render () {
    const { basic, label, showCopy, value, ...otherProps } = this.props;
    const inputProps = omit(otherProps, [ 'onChange', 'onEnter' ]);
    const valid = isValidAddress(value);
    const inputId = `input--${label || ''}--${id}`;

    const input = (
      <Input
        action={showCopy && value ? (<CopyButton value={value.toString()} />) : false}
        id={inputId}
        fluid
        onChange={this.handleChange}
        onKeyUp={this.handleKeyUp}
        placeholder='0x...'
        ref={this.setInputRef}
        value={value}
        {...inputProps}
      />
    );

    return (
      <Segment basic={basic}>
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
            {
              label
                ? (
                  <Form>
                    <Form.Field>
                      <label htmlFor={inputId}>{label}</label>
                      {input}
                    </Form.Field>
                  </Form>
                )
                : input
            }
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
