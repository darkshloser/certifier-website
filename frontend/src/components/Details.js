import React, { Component } from 'react';
import { Link } from 'react-router-dom';

import AppContainer from './AppContainer';
import DetailsMD from '../details.md';

export default class Details extends Component {
  state = {
    abiCopied: false,
    addressCopied: false,
    understood: false
  };

  render () {
    return (
      <AppContainer
        header={this.renderGoBack()}
        footer={this.renderGoBack()}
        title='LEARN MORE ABOUT PARITY ICO PASSPORT SERVICE'
      >
        <div>
          <DetailsMD />
        </div>
      </AppContainer>
    );
  }

  renderGoBack () {
    return (
      <div style={{ textAlign: 'right', paddingTop: '0.75em' }}>
        <Link
          to='/'
          style={{ color: 'gray', fontSize: '1.75em' }}
        >
          Go Back
        </Link>
      </div>
    );
  }
}
