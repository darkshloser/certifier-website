import { observer } from 'mobx-react';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { Button } from 'semantic-ui-react';

import config from '../../stores/config.store';

@observer
export default class ViewTransaction extends Component {
  static propTypes = {
    transaction: PropTypes.string
  };

  render () {
    const { transaction } = this.props;
    const etherscanUrl = config.etherscan + '/tx/' + transaction;

    if (!transaction) {
      return null;
    }

    return (
      <Button as='a' href={etherscanUrl} target='_blank' basic style={{ marginTop: '1.5em' }}>
        View transaction on Etherscan
      </Button>
    );
  }
}
