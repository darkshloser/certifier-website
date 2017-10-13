import keycode from 'keycode';
import { observer } from 'mobx-react';
import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { Button, Flag, Form, Header, Container, Segment } from 'semantic-ui-react';

import supportedCountries from '../../../../onfido-documents/supported-documents.json';

import appStore from '../../stores/app.store';
import certifierStore from '../../stores/certifier.store';
import feeStore from '../../stores/fee.store';

import AccountInfo from '../AccountInfo';
import CountrySelectionModal from '../CountrySelectionModal';
import Step from '../Step';

@observer
export default class ParityCertifier extends Component {
  state = {
    showCountrySelection: false
  };

  componentWillUnmount () {
    certifierStore.unmountOnfido();
  }

  render () {
    const { onfido } = certifierStore;

    if (onfido) {
      return this.renderOnfidoForm();
    }

    const { showCountrySelection } = this.state;
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

            <CountrySelectionModal
              onCancel={this.handleHideCountrySelection}
              onContinue={this.handleSelectCountry}
              show={showCountrySelection}
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

            {
              country
                ? (
                  <Form.Field
                    onClick={this.handleShowCountrySelection}
                    onKeyUp={this.handleCountryKeyUp}
                    style={{ pointer: 'cursor' }}
                  >
                    <Form.Input
                      label='Citizen Of'
                      readOnly
                      value={country.name}
                      style={{
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <Flag name={country.iso2.toLowerCase()} style={{
                        marginLeft: 'calc(-16px - 0.5em)'
                      }} />
                      <input style={{ cursor: 'pointer' }} />
                    </Form.Input>
                  </Form.Field>
                )
                : null
            }
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

  handleCountryKeyUp = (event) => {
    const key = keycode(event);

    if (key === 'enter' || key === 'space') {
      return this.handleShowCountrySelection();
    }
  };

  handleFirstNameChange = (event) => {
    const firstName = event.target.value;

    certifierStore.setFirstName(firstName);
  };

  handleHideCountrySelection = () => {
    this.setState({ showCountrySelection: false });
  };

  handleLastNameChange = (event) => {
    const lastName = event.target.value;

    certifierStore.setLastName(lastName);
  };

  handleNext = () => {
    certifierStore.createApplicant();
  };

  handleSelectCountry = (country) => {
    appStore.storeValidCitizenship(country.iso3);
    this.setState({ showCountrySelection: false });
  };

  handleSetOnfidoElt = () => {
    certifierStore.mountOnfido();
  };

  handleShowCountrySelection = () => {
    this.setState({ showCountrySelection: true });
  };
}
