import React, { Component } from 'react';
import { Button, Dropdown, Segment } from 'semantic-ui-react';

import AppContainer from './AppContainer';
import Text from './ui/Text';

import CheckContent from '../content/help/check.md';
import CertifyMoreContent from '../content/help/certify-more.md';
import RecertifyContent from '../content/help/recertify.md';
import RefundContent from '../content/help/refund.md';

const OtherContent = () => (
  <div>
    For any other inquiries, please contact us
    at <a href='mailto:picops@parity.io'>picops@parity.io</a>.
  </div>
);

const ISSUES = {
  check: { text: 'I would like to check if my ETH address is certified.', content: CheckContent },
  more: { text: 'I would like to certify more than one ETH address.', content: CertifyMoreContent },
  recertify: { text: 'I would like to change the ETH address associated with my ID.', content: RecertifyContent },
  refund: { text: 'I would like to get a refund for the fee I paid.', content: RefundContent },
  other: { text: 'Other', content: OtherContent, hideUseful: true }
};

const issueOptions = Object.keys(ISSUES)
  .map((k) => ({ value: k, text: ISSUES[k].text }));

export default class Help extends Component {
  state = {
    issue: null,
    useful: null
  };

  render () {
    return (
      <AppContainer
        hideStepper
        showBack
        style={{ paddingTop: '1em' }}
        title='Help Center'
      >
        <Text.Container>
          <Segment vertical>
            <Text>
              <b>How can we help you?</b>
            </Text>

            <Dropdown
              placeholder='Select your issue'
              fluid
              search
              selection
              options={issueOptions}
              onChange={this.handleChange}
            />
          </Segment>

          {this.renderIssue()}
        </Text.Container>
      </AppContainer>
    );
  }

  renderIssue () {
    const { issue } = this.state;

    if (!issue) {
      return null;
    }

    const { hideUseful } = issue;

    return (
      <div>
        <Segment vertical>
          <Text>
            {issue.content()}
          </Text>
        </Segment>

        {this.renderUseful(hideUseful)}
      </div>
    );
  }

  renderUseful (hide) {
    if (hide) {
      return null;
    }

    const { useful } = this.state;
    const showUseful = useful !== null;

    return (
      <Segment vertical style={{ textAlign: 'center' }}>
        <div style={{
          fontSize: '1.5em',
          padding: '1em 0 0.75em'
        }}>
          {
            showUseful
              ? this.renderUsefulText(useful)
              : 'Has this been useful?'
          }
        </div>
        {
          showUseful
            ? null
            : (
              <div>
                <Button basic onClick={this.handleClickYes}>
                  Yes
                </Button>
                <Button basic onClick={this.handleClickNo}>
                  No
                </Button>
              </div>
            )
        }
      </Segment>
    );
  }

  renderUsefulText (useful) {
    if (useful) {
      return 'Great! Thanks for using PICOPS.';
    }

    return (
      <div>
        Please contact us at <a href='mailto:picops@parity.io'>picops@parity.io</a>.
      </div>
    );
  }

  handleChange = (_, { value }) => {
    const issue = ISSUES[value];

    this.setState({ issue, useful: null });
  };

  handleClickNo = () => {
    this.setState({ useful: false });
  };

  handleClickYes = () => {
    this.setState({ useful: true });
  };
}
