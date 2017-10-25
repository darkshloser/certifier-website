import { observer } from 'mobx-react';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { Button, Container, Header, Segment } from 'semantic-ui-react';

import Footer from './Footer';
import Stepper from './Stepper';

import appStore from '../stores/app.store';

const baseContentStyle = {
  backgroundColor: 'white',
  padding: '2em 1.5em 1em'
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
    showBack: PropTypes.bool,
    style: PropTypes.object
  };

  static defaultProps = {
    hideStepper: false,
    showBack: false,
    style: {}
  };

  render () {
    const style = {
      textAlign: 'left'
    };

    const { padding } = appStore;
    const { children, title } = this.props;
    const embedded = !padding;
    const contentStyle = Object.assign({}, baseContentStyle, this.props.style);

    const titleNode = !embedded && title
      ? <Header as='h3' style={{ textTransform: 'uppercase', margin: '0' }}>{title}</Header>
      : <div />;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <div style={{ paddingBottom: '3em', flex: '1 1 auto' }}>
          <Container>
            <div style={{ fontSize: '4em', fontWeight: '200', lineHeight: '1em', margin: '0.25em 0 0.25em -5px' }}>
              PICOPS
            </div>
          </Container>
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
        </div>
        <div style={{ flex: '0 0 auto' }}>
          <Footer />
        </div>
      </div>
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
          onClick={this.handleBack}
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

  handleBack = (event) => {
    if (!window.opener) {
      return event;
    }

    event.preventDefault();
    event.stopPropagation();

    const opened = window.open('', window.opener.name);

    if (opened) {
      window.close();
    }
  };
}
