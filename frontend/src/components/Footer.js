import { observer } from 'mobx-react';
import React, { Component } from 'react';
import styled from 'styled-components';
import { Container } from 'semantic-ui-react';

const FooterContainer = styled.div`
  background-color: #F9F9F9;
  padding: 1.5em 1em 0.5em;
`;

const Content = styled.div`
  align-items: flex-start;
  display: flex;
  flex-direction: row;
  max-width: 80em;
  margin: 0 auto;
  flex-wrap: wrap;
`;

const Column = styled.div`
  display: flex;
  flex-direction: column;
  margin-right: 3em;
  padding-bottom: 1em;
`;

const Title = styled.div`
  color: gray;
  margin-bottom: 0.5em;
`;

const Grid = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
`;

const Link = styled.a`
  margin-bottom: 0.35em;
`;

@observer
export default class Footer extends Component {
  render () {
    return (
      <FooterContainer>
        <Container>
          <Content>
            <div style={{ fontSize: '2em', fontWeight: '200', margin: '5px 1em 0.5em 0' }}>
              PICOPS
            </div>

            <Grid>
              <Column>
                <Title>Help</Title>
                <Link target='picops-secondary' href='/#/faq'>
                  FAQ
                </Link>
                <Link target='picops-secondary' href='/#/details'>
                  Learn More
                </Link>
              </Column>

              <Column>
                <Title>Actions</Title>
                <Grid>
                  <Column>
                    <Link target='picops-secondary' href='/#/refund'>
                      Ask for a refund
                    </Link>
                    <Link target='picops-secondary' href='/#/check'>
                      Certification status
                    </Link>
                  </Column>
                  <Column>
                    <Link target='picops-secondary' href='/#/recertification'>
                      Change certified address
                    </Link>
                    <Link target='picops-secondary' href='/#/transfer'>
                      Transfer funds
                    </Link>
                  </Column>
                </Grid>
              </Column>

              <Column>
                <Title>Legal</Title>
                <Link target='picops-secondary' href='/#/tc'>
                  Terms & Conditions
                </Link>
              </Column>
            </Grid>
          </Content>
        </Container>
      </FooterContainer>
    );
  }
}
