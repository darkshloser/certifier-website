import { observer } from 'mobx-react';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { Button, Container, Header, Segment } from 'semantic-ui-react';

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
    title: PropTypes.string,

    action: PropTypes.object,
    hideStepper: PropTypes.bool,
    noPadding: PropTypes.bool,
    showBack: PropTypes.bool,
    style: PropTypes.object
  };

  static defaultProps = {
    hideStepper: false,
    noPadding: false,
    showBack: false,
    style: {}
  };

  render () {
    const style = {
      textAlign: 'left'
    };

    const { padding } = appStore;
    const { children, noPadding, title } = this.props;

    if (!noPadding && padding) {
      style.paddingBottom = '2em';
      style.paddingTop = '3em';
    }

    if (noPadding) {
      style.padding = '1.5em 0';
    }

    const contentStyle = Object.assign({}, baseContentStyle, this.props.style);

    const titleNode = !noPadding && padding
      ? <Header as='h4'>{title}</Header>
      : <div />;

    return (
      <Container style={style}>
        <div style={{
          alignItems: 'flex-end',
          display: 'flex',
          justifyContent: 'space-between'
        }}>
          {titleNode}
          {this.renderAction('top')}
        </div>
        {this.renderStepper()}
        <Segment basic style={contentStyle}>
          {children}
        </Segment>
        {this.renderAction('bottom')}
      </Container>
    );
  }

  renderAction (position) {
    let { action, showBack } = this.props;

    if (showBack) {
      action = { text: 'Back to PICOPS', href: '/#/' };
    }

    if (!action || !action.href || (action.position && action.position !== position)) {
      return;
    }

    return (
      <div style={{ textAlign: 'right' }}>
        <Button
          as='a'
          href={action.href}
          basic
          secondary
        >
          {action.text}
        </Button>
      </div>
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
