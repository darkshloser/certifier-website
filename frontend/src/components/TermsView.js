import { observer } from 'mobx-react';
import React, { Component } from 'react';
import { Header, Segment } from 'semantic-ui-react';

import appStore from '../stores/app.store';

import AppContainer from './AppContainer';
import Terms from './Terms';
import TermsMD from '../terms.md';

@observer
export default class TermsView extends Component {
  render () {
    const { padding } = appStore;
    const embedded = !padding;

    if (embedded) {
      return (
        <Terms />
      );
    }

    return (
      <AppContainer
        hideStepper
        showBack
        style={{ paddingTop: '1em' }}
      >
        <div>
          <Segment vertical>
            <Header as='h2'>
              PICOPS USER TERMS & CONDITIONS
            </Header>
            <TermsMD />
          </Segment>
        </div>
      </AppContainer>
    );
  }
}
