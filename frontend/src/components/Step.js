import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { Grid, Header } from 'semantic-ui-react';

export default class AlreadyPaid extends Component {
  static propTypes = {
    children: PropTypes.node.isRequired,
    description: PropTypes.node.isRequired,
    title: PropTypes.string.isRequired
  };

  render () {
    const { children, description: _desc, title } = this.props;

    const description = (typeof _desc === 'string')
      ? (<p>{_desc}</p>)
      : _desc;

    return (
      <Grid>
        <Grid.Column width={6}>
          <Header as='h3'>
            { title }
          </Header>
          <div style={{ lineHeight: '2em' }}>
            { description }
          </div>
        </Grid.Column>
        <Grid.Column width={10}>
          { children }
        </Grid.Column>
      </Grid>
    );
  }
}
