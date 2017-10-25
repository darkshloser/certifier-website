import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { Icon } from 'semantic-ui-react';

const containerStyle = {
  position: 'absolute',
  top: '-1.25em',
  left: 0,
  right: 0
};

const stepNameStyle = {
  position: 'absolute',
  marginLeft: '-75px',
  left: '0.75em',
  top: '-4.5em',
  width: '150px',
  textAlign: 'center',
  height: '4.5em',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center'
};

export default class Stepper extends Component {
  static propTypes = {
    steps: PropTypes.array.isRequired,
    step: PropTypes.number.isRequired
  };

  render () {
    const { step, steps } = this.props;

    if (step < 0) {
      return null;
    }

    const count = steps.length - 1;

    return (
      <div style={{
        padding: '1em 75px',
        height: '7em',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end'
      }}>
        <div style={{
          width: '100%',
          height: '1px',
          position: 'relative',
          backgroundColor: 'lightgray',
          fontSize: '0.9em',
          top: '-1em'
        }}>
          <div style={containerStyle}>
            {steps.map((title, index) => this.renderStep(title, index, count))}
          </div>
        </div>
      </div>
    );
  }

  renderStep (title, index, count) {
    const { step } = this.props;
    const position = Math.round(100 * index / count);

    let color;
    let icon;

    if (index < step) {
      icon = 'check';
      color = '#21ba45';
    } else if (index === step) {
      icon = 'point';
      color = '#2185d0';
    } else {
      color = 'lightgray';
    }

    return (
      <div
        key={`${title}-${index}`}
        style={{ position: 'absolute', left: `calc(${position}% - 0.75em)`, top: '0.5em' }}
      >
        <Icon
          circular
          name={icon}
          size='small'
          style={{
            backgroundColor: color,
            boxShadow: 'none',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 !important'
          }}
        />
        <div style={stepNameStyle}>
          <span>{title}</span>
        </div>
      </div>
    );
  }
}
