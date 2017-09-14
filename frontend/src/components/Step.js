import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { Grid, Header, Segment } from 'semantic-ui-react';

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
        <Grid.Column tablet={16} computer={6}>
          <Segment basic>
            <Header as='h3'>
              { title }
            </Header>
            <div style={{ lineHeight: '2em' }}>
              { description }
            </div>
          </Segment>
        </Grid.Column>
        <Grid.Column tablet={16} computer={10}>
          { children }
        </Grid.Column>
      </Grid>
    );
  }
}
