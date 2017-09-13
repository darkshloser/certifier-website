import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { Icon, Progress } from 'semantic-ui-react';

const containerStyle = {
  position: 'absolute',
  top: '-1.25em',
  left: 0,
  right: 0
};

const stepNameStyle = {
  position: 'absolute',
  marginLeft: '-50px',
  left: '0.75em',
  top: '-2em',
  width: '100px',
  textAlign: 'center'
};

export default class Stepper extends Component {
  static propTypes = {
    steps: PropTypes.array.isRequired,
    step: PropTypes.number.isRequired
  };

  render () {
    const { step, steps } = this.props;
    const count = steps.length - 1;
    const progress = Math.round(100 * step / count);

    return (
      <div style={{ padding: '1em 50px' }}>
        <Progress
          color='green'
          percent={progress}
          size='tiny'
        >
          <div style={containerStyle}>
            {steps.map((title, index) => this.renderStep(title, index, count))}
          </div>
        </Progress>
      </div>
    );
  }

  renderStep (title, index, count) {
    const { step } = this.props;
    const position = Math.round(100 * index / count);

    const color = index <= step
      ? '#21ba45'
      : 'lightgray';

    const icon = index < step
      ? 'check'
      : (index === step ? 'spinner' : undefined);

    const loading = index === step;

    return (
      <div
        key={`${title}-${index}`}
        style={{ position: 'absolute', left: `calc(${position}% - 0.75em)` }}
      >
        <Icon
          circular
          loading={loading}
          name={icon}
          size='small'
          style={{ backgroundColor: color, boxShadow: 'none', color: 'white' }}
        />
        <div style={stepNameStyle}>
          {title}
        </div>
      </div>
    );
  }
}
