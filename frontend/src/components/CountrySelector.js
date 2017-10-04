import { countries } from 'country-data';
import Datamap from 'datamaps';
import React, { Component } from 'react';
import { Button, Card, Grid, Header, Icon, Modal } from 'semantic-ui-react';

import appStore from '../stores/app.store';

const VALID_COLOR = '#4a90e2';
const INVALID_COLOR = '#4d4d4d';
const BACKGROUND_COLOR = '#f2f2f2';

const mapStyle = {
  backgroundColor: BACKGROUND_COLOR,
  // height: 150,
  // margin: '0 2em 1em',
  padding: '1.5em 1em',
  borderRadius: '1em'
};

const panelStyle = {
  // flex: 1,
  // margin: '0 2em',
  // marginBottom: '2em'
};

export default class CountrySelector extends Component {
  state = {
    showInvalidModal: false
  };

  componentWillMount () {
    this.blacklistedCountriesNames = appStore.blacklistedCountries
      .map((countryKey) => countries[countryKey].name);

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

        {this.renderModal()}

        <Grid style={{ marginTop: '4em' }}>
          <Grid.Column tablet={16} computer={8} style={panelStyle}>
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

          <Grid.Column tablet={16} computer={8} style={panelStyle}>
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

  renderModal () {
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
    // const prevTransform = g.getAttribute('transform');
    // const prevScale = /scale\((.+)\)/.test(prevTransform)
    //   ? parseFloat(/scale\((.+)\)/.exec(prevTransform)[1])
    //   : 1;

    // console.warn('prevScale', prevScale);

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

  handleCloseInvalid = () => {
    this.setState({ showInvalidModal: false });
  };

  handleInvalid = () => {
    this.setState({ showInvalidModal: true });
  };

  handleValid = () => {
    appStore.storeValidCitizenship();
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
