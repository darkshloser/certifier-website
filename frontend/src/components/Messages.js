import { observer } from 'mobx-react';
import React, { Component } from 'react';
import { Message, Portal } from 'semantic-ui-react';

import appStore from '../stores/app.store';

const messageStyle = {
  margin: '0.5em 1em',
  width: '300px',
  cursor: 'pointer'
};

@observer
export default class Messages extends Component {
  render () {
    const { messages: _messages } = appStore;
    const messages = Object.keys(_messages).map((key) => _messages[key]);

    return (
      <Portal open={messages.length > 0}>
        <div style={{
          position: 'fixed', top: 0, right: 0,
          textAlign: 'left'
        }}>
          {messages.map((message) => this.renderMessage(message))}
        </div>
      </Portal>
    );
  }

  renderMessage (message) {
    const { id, content, title } = message;

    const onDismiss = () => {
      appStore.removeMessage(id);
    };

    return (
      <div key={id} style={messageStyle}>
        <Message
          compact
          content={content}
          error
          header={title || 'An error occured'}
          icon='warning'
          onClick={onDismiss}
        />
      </div>
    );
  }
}
