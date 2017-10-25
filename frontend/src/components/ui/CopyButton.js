import copy from 'copy-to-clipboard';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { Button, Popup } from 'semantic-ui-react';

export default class CopyButton extends Component {
  static propTypes = {
    value: PropTypes.string.isRequired,

    trigger: PropTypes.node
  };

  state = {
    copied: false
  };

  render () {
    const { copied } = this.state;

    return (
      <Popup
        trigger={this.renderTrigger()}
        content={copied ? 'Copied!' : 'Copy'}
        on='click'
        open={copied}
      />
    );
  }

  renderTrigger () {
    const { copied } = this.state;
    const { trigger } = this.props;

    if (!trigger) {
      return (
        <Button color='blue' disabled={copied} icon='copy' onClick={this.handleCopy} />
      );
    }

    return (
      <div onClick={this.handleCopy} style={{
        cursor: 'pointer'
      }}>
        {trigger}
      </div>
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
