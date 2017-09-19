import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { Container, Header, Segment } from 'semantic-ui-react';

import appStore from '../stores/app.store';

const contentStyle = {
  backgroundColor: 'white',
  padding: '4em 2.5em'
};

export default class AppContainer extends Component {
  static propTypes = {
    children: PropTypes.node.isRequired,
    title: PropTypes.string.isRequired,

    footer: PropTypes.node,
    header: PropTypes.node
  };

  render () {
    const style = {
      textAlign: 'left'
    };

    const { padding } = appStore;
    const { children, header, footer, title } = this.props;

    if (padding) {
      style.paddingBottom = '2em';
      style.paddingTop = '5em';
    }

    const titleNode = padding
      ? <Header as='h4'>{title}</Header>
      : null;

    return (
      <Container style={style}>
        {titleNode}
        {header || null}
        <Segment basic style={contentStyle}>
          {children}
        </Segment>
        {footer || null}
      </Container>
    );
  }
}
