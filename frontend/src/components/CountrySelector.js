import { countries } from 'country-data';
import Datamap from 'datamaps';
import React, { Component } from 'react';
import { Button, Card, Checkbox, Dropdown, Grid, Header, Icon, Image, Modal } from 'semantic-ui-react';

import appStore from '../stores/app.store';
import supportedCountries from '../../../onfido-documents/supported-documents.json';

import DriverLicense from '../images/DriverLicense.svg';
import IDCard from '../images/IDCard.svg';
import Passport from '../images/Passport.svg';

// Not supporting the USA
delete supportedCountries['USA'];

const countryOptions = Object.keys(supportedCountries)
  .map((key) => supportedCountries[key])
  .map((country) => ({
    key: country.iso3,
    value: country.iso3,
    flag: country.iso2.toLowerCase(),
    text: country.name
  }));

const VALID_COLOR = '#4a90e2';
const INVALID_COLOR = '#4d4d4d';
const BACKGROUND_COLOR = '#f2f2f2';

const mapStyle = {
  backgroundColor: BACKGROUND_COLOR,
  padding: '1.5em 1em',
  borderRadius: '1em'
};

export default class CountrySelector extends Component {
  state = {
    country: null,
    showInvalidModal: false,
    showValidModal: false,
    confirmPossession: false,
    confirmValidity: false
  };

  componentWillMount () {
    this.blacklistedCountriesNames = appStore.blacklistedCountries
      .map((countryKey) => {
        let name = countries[countryKey].name.split(',');

        if (name.length === 2) {
          return name[1] + ' ' + name[0];
        }

        return name[0];
      });

    this.mapData = appStore.blacklistedCountries
      .reduce((data, countryKey) => {
        data[countryKey] = { fillKey: 'DISABLED' };
        return data;
      }, {});

    window.addEventListener('resize', this.resize);
  }

  componentWillUnmount () {
    window.removeEventListener('resize', this.resize);
  }

  render () {
    return (
      <div>
        <Header as='h2' textAlign='center'>
          CHOOSE YOUR CITIZENSHIP
        </Header>

        {this.renderInvalidModal()}
        {this.renderValidModal()}

        <Grid style={{ marginTop: '4em' }}>
          <Grid.Column tablet={16} computer={8}>
            <Card fluid link style={mapStyle} onClick={this.handleInvalid}>
              <div ref={this.setInvalidRef} style={{ height: '150px' }} />
            </Card>

            <div style={{ textAlign: 'center' }}>
              {this.renderCountryList()}
              <p style={{
                color: 'red',
                fontWeight: 'bold'
              }}>
                ( US Citizen )
              </p>
            </div>
          </Grid.Column>

          <Grid.Column tablet={16} computer={8}>
            <Card fluid link style={mapStyle} onClick={this.handleValid}>
              <div ref={this.setValidRef} style={{ height: '150px' }} />
            </Card>

            <div style={{ textAlign: 'center' }}>
              <p>Non-US citizen – Rest of the world</p>
            </div>
          </Grid.Column>
        </Grid>
      </div>
    );
  }

  renderCountryList () {
    const list = this.blacklistedCountriesNames;

    if (list.length <= 2) {
      return (
        <p><span>{list.join(' and ')}.</span></p>
      );
    }

    return (
      <p>
        <span>{list.slice(0, -1).join(', ')} </span>
        <span>and {list.slice(-1)[0]}.</span>
      </p>
    );
  }

  renderInvalidModal () {
    const { showInvalidModal } = this.state;

    return (
      <Modal
        basic
        open={showInvalidModal}
        onClose={this.handleCloseInvalid}
        size='small'
      >
        <Header icon='world' content='Unfortunately, you cannot continue...' />
        <Modal.Content>
          <p>
            PICOPS is not offered to US citizens at this stage.
          </p>
        </Modal.Content>
        <Modal.Actions>
          <Button inverted onClick={this.handleCloseInvalid}>
            <Icon name='close' /> Close
          </Button>
        </Modal.Actions>
      </Modal>
    );
  }

  renderValidModal () {
    const { confirmPossession, confirmValidity, country, showValidModal } = this.state;

    return (
      <Modal
        basic
        open={showValidModal}
        onClose={this.handleCloseValid}
        size='small'
      >
        <Header icon='world' content='Select your country of citizenship' />
        <Modal.Content>
          <Dropdown
            placeholder='Select Country'
            fluid
            search
            selection
            onChange={this.handleCountryChange}
            options={countryOptions}
          />
          {this.renderSelectedCountry()}
          {this.renderConfirm()}
        </Modal.Content>
        <Modal.Actions>
          <Button inverted onClick={this.handleCloseValid}>
            <Icon name='close' /> Close
          </Button>
          <Button primary inverted
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
              <label style={{ color: 'white', fontSize: '1.1em' }}>
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
              <label style={{ color: 'white', fontSize: '1.1em' }}>
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
    // Special means back and front required
    const hasSpecial = documents.findIndex((doc) => doc.special) >= 0;

    return (
      <div>
        <Header as='h3' textAlign='center' inverted style={{ margin: '2em 1em' }}>
          Citizens of this country can certify their identiy with the following document(s)
        </Header>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          {documents.map((doc) => this.renderDocumentIcons(doc))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          {documents.map((doc) => this.renderDocumentLabels(doc))}
        </div>

        {
          hasSpecial
            ? (
              <p>
                *The back of document is required for processing
              </p>
            )
            : null
        }
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
          border: '1px solid white',
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
          fontSize: '1.2em'
        }}>
          {doc.label}
        </div>
      </div>
    );
  }

  renderDocumentIcon (docType) {
    if (docType === 'passport') {
      return (
        <Image src={Passport} />
      );
    }

    if (docType === 'national_identity_card') {
      return (
        <Image src={IDCard} />
      );
    }

    if (docType === 'driving_licence') {
      return (
        <Image src={DriverLicense} />
      );
    }

    return null;
  }

  resize = () => {
    this.resizeMap(this.invalidMap);
    this.resizeMap(this.validMap);
  }

  resizeMap (map) {
    if (!map) {
      return;
    }

    const container = map.options.element;
    const svg = container.querySelector('svg');
    const g = svg.querySelector('g');

    const prevWidth = svg.getAttribute('data-width');

    // Get container new width
    const nextWidth = container.clientWidth;
    const nextHeight = 9 / 16 * nextWidth;

    // Update container and map SVG
    svg.setAttribute('height', nextHeight);
    svg.setAttribute('width', nextWidth);
    container.style.height = `${nextHeight}px`;

    const scale = nextWidth / prevWidth;

    g.setAttribute('transform', `scale(${scale})`);

    const gMeasures = g.getBoundingClientRect();
    const svgMeasures = svg.getBoundingClientRect();
    const tY = (svgMeasures.top - gMeasures.top) + (svgMeasures.height - gMeasures.height) / 2;

    // Update map width
    g.setAttribute('transform', `scale(${scale}) translate(0, ${tY / scale})`);
  }

  createMap = (element, invalid = false) => {
    return new Datamap({
      projection: 'mercator',
      geographyConfig: {
        highlightOnHover: false,
        popupOnHover: false
      },
      fills: {
        defaultFill: invalid ? INVALID_COLOR : VALID_COLOR,
        DISABLED: invalid ? VALID_COLOR : INVALID_COLOR
      },
      // responsive: true,
      data: this.mapData,
      element
    });
  };

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

  handleCloseInvalid = () => {
    this.setState({ showInvalidModal: false });
  };

  handleCloseValid = () => {
    this.setState({ showValidModal: false, country: null, confirmPossession: false, confirmValidity: false });
  }

  handleInvalid = () => {
    this.setState({ showInvalidModal: true });
  };

  handleValid = () => {
    this.setState({ showValidModal: true });
  }

  handleContinue = () => {
    appStore.storeValidCitizenship(this.state.country.iso3);
    appStore.goto('fee');
  };

  setInvalidRef = (element) => {
    if (!element) {
      return;
    }

    this.invalidMapElement = element;
    this.invalidMap = this.createMap(element, true);
    this.resize();
  };

  setValidRef = (element) => {
    if (!element) {
      return;
    }

    this.validMapElement = element;
    this.validMap = this.createMap(element, false);
    this.resize();
  };
}
