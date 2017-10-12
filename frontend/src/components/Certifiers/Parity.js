import { observer } from 'mobx-react';
import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { Button, Form, Header, Container, Segment } from 'semantic-ui-react';

import certifierStore from '../../stores/certifier.store';
import feeStore from '../../stores/fee.store';

import AccountInfo from '../AccountInfo';
import Step from '../Step';

@observer
export default class ParityCertifier extends Component {
  componentWillUnmount () {
    certifierStore.unmountOnfido();
  }

  render () {
    const { onfido } = certifierStore;

    if (onfido) {
      return this.renderOnfidoForm();
    }

    const { payer } = feeStore;

    return (
      <Step
        description={(
          <div>
            <AccountInfo
              address={payer}
              fullAddress
              showBalance={false}
              showCertified={false}
            />

            <p>
              Prepare a document proving your identity (Passport, Driver's Licence or National ID).
            </p>
            <p>
              <strong>
                You will have to upload scan or high quality picture of said document on the next step.
                Separate images for back and front of the document if applicable.
                Make sure to check out <Link to='/faq'>our FAQ</Link> if you have any more questions.
              </strong>
            </p>
            <p><strong>
              If you have paid the fee and have not initiated the KYC process you may be eligible
              for a refund. Please email us at <a href='mailto:picops@parity.io'>picops@parity.io</a>.
            </strong></p>
          </div>
        )}
        title='PROVIDE YOUR IDENTITY TO CERTIFY THIS ADDRESS'
      >
        {this.renderContent()}
      </Step>
    );
  }

  renderContent () {
    const { firstName, lastName, loading } = certifierStore;

    const valid = firstName && firstName.length >= 2 &&
      lastName && lastName.length >= 2;

    return (
      <div>
        <Segment basic>
          <Header as='h4'>
            PLEASE ENTER THE FOLLOWING INFORMATION <em style={{ color: 'red' }}>AS IT APPEARS IN YOUR DOCUMENT</em>:
          </Header>

          <Form>
            <Form.Field>
              <Form.Input
                label='Surname (Family name)'
                onChange={this.handleLastNameChange}
                placeholder='Surname (Family name)'
                value={lastName}
              />
            </Form.Field>
            <Form.Field>
              <Form.Input
                label='Given Names'
                onChange={this.handleFirstNameChange}
                placeholder='Given Names'
                value={firstName}
              />
            </Form.Field>
          </Form>
        </Segment>
        <Segment basic style={{ textAlign: 'right' }}>
          <Button
            disabled={!valid || loading}
            loading={loading}
            onClick={this.handleNext}
            primary
          >
            {
              loading
                ? 'Loading...'
                : 'Next'
            }
          </Button>
        </Segment>
      </div>
    );
  }

  renderOnfidoForm () {
    return (
      <Container>
        <Segment basic>
          <div id='onfido-mount' ref={this.handleSetOnfidoElt} />
        </Segment>
      </Container>
    );
  }

  handleFirstNameChange = (event) => {
    const firstName = event.target.value;

    certifierStore.setFirstName(firstName);
  };

  handleLastNameChange = (event) => {
    const lastName = event.target.value;

    certifierStore.setLastName(lastName);
  };

  handleNext = () => {
    certifierStore.createApplicant();
  };

  handleSetOnfidoElt = () => {
    certifierStore.mountOnfido();
  }
}
