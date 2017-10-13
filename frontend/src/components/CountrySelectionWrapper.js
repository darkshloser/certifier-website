import React, { Component } from 'react';
import CountrySelectionModal from './CountrySelectionModal';

import appStore from '../stores/app.store';
import { parentMessage } from '../utils';

export default class CountrySelectionWrapper extends Component {
  render () {
    return (
      <CountrySelectionModal
        onContinue={this.handleContinue}
        show
      />
    );
  }

  handleContinue = (country) => {
    appStore.storeValidCitizenship(country.iso3);

    parentMessage({
      action: 'selected-country',
      country
    });
  }
}
