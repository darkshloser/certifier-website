import { observer } from 'mobx-react';
import React, { Component } from 'react';

import Certifiers from './Certifiers';
import ErrorCertification from './ErrorCertification';
import PendingCertification from './PendingCertification';

import certifierStore from '../stores/certifier.store';

@observer
export default class Certifier extends Component {
  render () {
    const { errorReason, pending } = certifierStore;

    if (errorReason) {
      return (
        <ErrorCertification />
      );
    }

    if (pending) {
      return (
        <PendingCertification />
      );
    }

    return (
      <Certifiers.Parity />
    );
  }
}
