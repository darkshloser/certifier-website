import React, { Component } from 'react';

import DetailsMD from '../details.md';

import AppContainer from './AppContainer';

export default class Details extends Component {
  state = {
    abiCopied: false,
    addressCopied: false,
    understood: false
  };

  render () {
    return (
      <AppContainer
        footer={{
          link: '/',
          text: 'Go back'
        }}
        title='LEARN MORE ABOUT PARITY ICO PASSPORT SERVICE'
      >
        <div>
          <DetailsMD />
          {this.renderMore()}
        </div>
      </AppContainer>
    );
  }
}
