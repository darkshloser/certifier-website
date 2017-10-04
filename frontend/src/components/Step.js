import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { Grid, Header, Segment } from 'semantic-ui-react';

export default class AlreadyPaid extends Component {
  static propTypes = {
    children: PropTypes.node.isRequired,
    description: PropTypes.node.isRequired,
    title: PropTypes.string.isRequired,

    centered: PropTypes.bool
  };

  static defaultProps = {
    centered: false
  };

  render () {
    const { centered, children, description: _desc, title } = this.props;

    const description = (typeof _desc === 'string')
      ? (<p>{_desc}</p>)
      : _desc;

    return (
      <Grid>
        <Grid.Column tablet={16} computer={centered ? 16 : 6}>
          <Segment basic>
            <Header as='h3'>
              { title }
            </Header>
            <div style={{ lineHeight: '2em' }}>
              { description }
            </div>
          </Segment>
        </Grid.Column>
        <Grid.Column tablet={16} computer={centered ? 16 : 10}>
          { children }
        </Grid.Column>
      </Grid>
    );
  }
}
