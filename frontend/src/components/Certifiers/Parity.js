import { observer } from 'mobx-react';
import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { Button, Form, Header, Container, Segment } from 'semantic-ui-react';

import supportedCountries from '../../../../onfido-documents/supported-documents.json';

import appStore from '../../stores/app.store';
import certifierStore from '../../stores/certifier.store';
import feeStore from '../../stores/fee.store';

import AccountInfo from '../AccountInfo';
import { countryOptions } from '../CountrySelectionModal';
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
              Prepare a document proving your identity (passport, driver's licence or national ID).
            </p>

            <p>
              Certification with a good-quality passport image usually
              takes just a few minutes; a bad-quality, non-passport
              image may take many hours. <b>FOR BEST RESULTS SUBMIT A HIGH-QUALITY,
              SHARP IMAGE OF YOUR PASSPORT</b>.
              You will have to
              upload a scan or high quality picture of your document. Separate images for back and
              front of the document may be required. Make sure to check
              out <Link to='/faq' target='picops-secondary'>our FAQ</Link> if you have any more questions.
            </p>

            <p>
              If you have paid the fee and have not initiated the KYC process, you
              may be eligible for a refund. Please have a look at our <a href='/#/help' target='picops-secondary'>help page</a>.
            </p>
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

    const country = supportedCountries[appStore.citizenship];

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
            <Form.Field>
              <Form.Dropdown
                fluid
                label='Citizen Of'
                onChange={this.handleCountryChange}
                options={countryOptions}
                placeholder='Select Country'
                search
                selection
                value={country ? country.iso3 : null}
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
  };

  handleCountryChange = (_, { value }) => {
    const country = supportedCountries[value];

    appStore.storeValidCitizenship(country.iso3);
  };
}
