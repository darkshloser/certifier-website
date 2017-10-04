import { observer } from 'mobx-react';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { Container, Header, Segment } from 'semantic-ui-react';

import Stepper from './Stepper';

import appStore from '../stores/app.store';

const baseContentStyle = {
  backgroundColor: 'white',
  padding: '4em 2.5em'
};

const STEPS = [
  'Terms & Conditions',
  'Fee payment',
  'Identity certification'
];

@observer
export default class AppContainer extends Component {
  static propTypes = {
    children: PropTypes.node.isRequired,
    title: PropTypes.string.isRequired,

    footer: PropTypes.node,
    header: PropTypes.node,
    hideStepper: PropTypes.bool,
    style: PropTypes.object
  };

  static defaultProps = {
    hideStepper: false,
    style: {}
  };

  render () {
    const style = {
      textAlign: 'left'
    };

    const { padding } = appStore;
    const { children, header, footer, title } = this.props;

    if (padding) {
      style.paddingBottom = '2em';
      style.paddingTop = '3em';
    }

    const contentStyle = Object.assign({}, baseContentStyle, this.props.style);

    const titleNode = padding
      ? <Header as='h4'>{title}</Header>
      : null;

    return (
      <Container style={style}>
        {titleNode}
        {header || null}
        {this.renderStepper()}
        <Segment basic style={contentStyle}>
          {children}
        </Segment>
        {footer || null}
      </Container>
    );
  }

  renderStepper () {
    const { hideStepper } = this.props;

    if (hideStepper) {
      return null;
    }

    const { stepper, showStepper } = appStore;

    if (!showStepper) {
      return null;
    }

    return (
      <Stepper
        step={stepper}
        steps={STEPS}
      />
    );
  }
}
