import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { Link } from 'react-router-dom';
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

    footer: PropTypes.object
  };

  render () {
    const style = {
      textAlign: 'left'
    };

    const { padding } = appStore;
    const { children, title } = this.props;

    if (padding) {
      style.paddingBottom = '2em';
      style.paddingTop = '5em';
    }

    const header = padding
      ? <Header as='h4'>{title}</Header>
      : null;

    return (
      <Container style={style}>
        {header}
        <Segment basic style={contentStyle}>
          {children}
        </Segment>
        {this.renderFooter()}
      </Container>
    );
  }

  renderFooter () {
    const { footer } = this.props;

    if (!footer) {
      return null;
    }

    const { link, text } = footer;

    return (
      <div style={{ textAlign: 'right' }}>
        <Link
          to={link}
          style={{ color: 'gray' }}
        >
          {text}
        </Link>
      </div>
    );
  }
}
