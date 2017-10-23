import copy from 'copy-to-clipboard';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { Button, Popup } from 'semantic-ui-react';

export default class CopyButton extends Component {
  static propTypes = {
    value: PropTypes.string.isRequired
  };

  state = {
    copied: false
  };

  render () {
    const { copied } = this.state;

    return (
      <Popup
        trigger={<Button color='blue' disabled={copied} icon='copy' onClick={this.handleCopy} />}
        content='Copied!'
        on='click'
        open={copied}
        position='top right'
      />
    );
  }

  handleCopy = () => {
    copy(this.props.value);

    this.setState({ copied: true });

    setTimeout(() => {
      this.setState({ copied: false });
    }, 1500);
  };
}
