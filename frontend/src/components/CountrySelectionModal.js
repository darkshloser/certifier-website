import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { Button, Checkbox, Dropdown, Header, Icon, Image, Modal } from 'semantic-ui-react';

import appStore from '../stores/app.store';
import supportedCountries from '../../../onfido-documents/supported-documents.json';

import DriverLicenseWhite from '../images/DriverLicense.svg';
import DriverLicenseBlack from '../images/DriverLicenseBlack.svg';
import IDCardWhite from '../images/IDCard.svg';
import IDCardBlack from '../images/IDCardBlack.svg';
import PassportWhite from '../images/Passport.svg';
import PassportBlack from '../images/PassportBlack.svg';

// Not supporting the USA
delete supportedCountries['USA'];

appStore.exludedCountries.forEach((isoCode) => {
  delete supportedCountries[isoCode];
});

export const countryOptions = Object.keys(supportedCountries)
  .map((key) => supportedCountries[key])
  .map((country) => ({
    key: country.iso3,
    value: country.iso3,
    flag: country.iso2.toLowerCase(),
    text: country.name
  }))
  .sort((ca, cb) => ca.text.localeCompare(cb.text));

const black = !!appStore.padding;

export default class CountrySelectionModal extends Component {
  static propTypes = {
    onContinue: PropTypes.func.isRequired,
    show: PropTypes.bool.isRequired,

    onCancel: PropTypes.func
  };

  state = {
    country: appStore.citizenship
      ? supportedCountries[appStore.citizenship]
      : null,
    confirmPossession: false,
    confirmValidity: false
  };

  render () {
    const { onCancel, show } = this.props;
    const { confirmPossession, confirmValidity, country } = this.state;

    // Special means back and front required
    const hasSpecial = country
      ? country.documents.findIndex((doc) => doc.label.includes('*')) >= 0
      : null;

    return (
      <Modal
        basic
        open={show}
        onClose={this.handleClose}
        size='small'
        data-iframe-height='true'
        dimmer={black}
      >
        <Header icon='world' content='Select your country of citizenship'
          style={{ color: black ? 'white' : 'black' }}
        />
        <Modal.Content>
          <Dropdown
            placeholder='Select Country'
            fluid
            search
            selection
            onChange={this.handleCountryChange}
            options={countryOptions}
            value={country ? country.iso3 : null}
          />
          {this.renderSelectedCountry()}
          {this.renderConfirm()}
        </Modal.Content>
        <Modal.Actions>
          {
            hasSpecial
              ? (
                <p style={{ color: black ? 'white' : 'black', textAlign: 'left' }}>
                  *The back of document is required for processing
                </p>
              )
              : null
          }

          {
            onCancel
              ? (
                <Button inverted={black} onClick={this.handleClose}>
                  <Icon name='close' /> Close
                </Button>
              )
              : null
          }
          <Button primary inverted={black}
            disabled={!country || !confirmPossession || !confirmValidity}
            onClick={this.handleContinue}
          >
            <Icon name='check' /> Continue
          </Button>
        </Modal.Actions>
      </Modal>
    );
  }

  renderConfirm () {
    const { country } = this.state;

    if (!country) {
      return null;
    }

    const { confirmPossession, confirmValidity } = this.state;

    return (
      <div style={{ margin: '2em 0 0 1em' }}>
        <div>
          <Checkbox
            label={(
              <label style={{ color: black ? 'white' : 'black', fontSize: '1.1em' }}>
                I confirm that I possess one of these documents
              </label>
            )}
            checked={confirmPossession}
            onChange={this.handlePossessionChecked}
            style={{ marginBottom: '1em' }}
          />
        </div>
        <div>
          <Checkbox
            label={(
              <label style={{ color: black ? 'white' : 'black', fontSize: '1.1em' }}>
                I confirm that it is not expired
              </label>
            )}
            checked={confirmValidity}
            onChange={this.handleValidityChecked}
          />
        </div>
      </div>
    );
  }

  renderSelectedCountry () {
    const { country } = this.state;

    if (!country) {
      return null;
    }

    const { documents } = country;

    return (
      <div>
        <Header as='h3' textAlign='center' inverted={black} style={{ margin: '2em 1em' }}>
          Citizens of this country can certify their identity with the following document(s)
        </Header>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          {documents.map((doc) => this.renderDocumentIcons(doc))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          {documents.map((doc) => this.renderDocumentLabels(doc))}
        </div>

        <p style={{ color: black ? 'white' : 'black', textAlign: 'left' }}>
          Certification with a good-quality passport image usually
          takes just a few minutes; a bad-quality, non-passport
          image may take many hours. <b>FOR BEST RESULTS SUBMIT A HIGH-QUALITY,
          SHARP IMAGE OF YOUR PASSPORT</b>.
        </p>
      </div>
    );
  }

  renderDocumentIcons (doc) {
    return (
      <div key={doc.value} style={{ width: '33%', padding: '1em' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          // backgroundColor: 'black',
          height: '100%',
          width: '100%',
          padding: '2em 1em',
          border: `1px solid ${black ? 'white' : 'black'}`,
          borderRadius: '5px'
        }}>
          {this.renderDocumentIcon(doc.value)}
        </div>
      </div>
    );
  }

  renderDocumentLabels (doc) {
    return (
      <div key={doc.value} style={{ width: '33%', padding: '1em' }}>
        <div style={{
          textAlign: 'center',
          fontSize: '1.2em',
          color: black ? 'white' : 'black'
        }}>
          {doc.label}
        </div>
      </div>
    );
  }

  renderDocumentIcon (docType) {
    if (docType === 'passport') {
      return (
        <Image src={black ? PassportWhite : PassportBlack} />
      );
    }

    if (docType === 'national_identity_card') {
      return (
        <Image src={black ? IDCardWhite : IDCardBlack} />
      );
    }

    if (docType === 'driving_licence') {
      return (
        <Image src={black ? DriverLicenseWhite : DriverLicenseBlack} />
      );
    }

    return null;
  }

  handlePossessionChecked = (_, { checked }) => {
    this.setState({ confirmPossession: checked });
  };

  handleValidityChecked = (_, { checked }) => {
    this.setState({ confirmValidity: checked });
  };

  handleCountryChange = (_, { value }) => {
    const country = supportedCountries[value];

    this.setState({ country });
  };

  handleClose = () => {
    const { onCancel } = this.props;

    if (!onCancel) {
      return;
    }

    onCancel();
    this.setState({ confirmPossession: false, confirmValidity: false });
  }

  handleContinue = () => {
    if (!this.state.country) {
      return;
    }

    this.props.onContinue(this.state.country);
  };
}
