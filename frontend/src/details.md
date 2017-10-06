## PICOPS - Parity ICO Passport Service

### PREAMBLE

Many transactional applications require up-front knowledge concerning certain aspects of a counterparty's identity. Typically these requirements are called “identity checks” or “KYC” (“Know Your Customer”). In many respects, the blockchain is no different and legal entities who have a beneficial relationship with blockchain-logic may also have the need for ensuring the blockchain logic itself ascertains this kind of knowledge before engaging in a transactional relationship.

ICOs and token sales are a novel method of crowdfunding that have been facilitated by trust-free “blockchain” technology and in no small part the Ethereum blockchain. While many of the early token sales offered entirely unrestrained access to the general international public, regulatory concerns have lead to a belief that some restrictions should be placed on who may take part.

The Parity ICO Passport Service (PICOPS) is a Parity hosted service comprising a smart-contract and back-end server, to facilitate a specific identity verification striking a good balance between the privacy of those that become certified and ensuring maximum certainty of those that wish to utilise the certifications. It is provided to the community gratis, with no warranty, with a non-binding pledge to operate the service as described in “IMPLEMENTATION”.

### INTENTION

PICOPS was created and is hosted by Parity Technologies in order to allow the majority of members of the international public to associate a single Ethereum address with their unique identity. A standard certification contract, hosted on Ethereum, manages this association between “unique and valid identity” and the Ethereum address. This certification contract can then, in principle, be used as a trust-free whitelist by general contracts within the Ethereum execution environment.
The intent of the PICOPS is to place up-front restrictions on the person controlling each white-listed address, or, in other words “who” is able to be certified. In short, these restrictions are:

1. must have a valid government-issued ID;
1. must not be a citizen of the U.S.;
1. must not be a named individual on a major official sanctions watchlist;
1. must not already have been certified under a different Ethereum address.

As such, by an Ethereum address being certified according to this smart-contract, our intent is to ensure, within practical limitations, that it belongs to a unique person who is a citizen of a country that is not the United States and to whom sanctions or business restrictions do not apply. Some experts consider this set of restrictions an important bulwark (in combination with various other measures) to achieve a higher degree of safety regarding ICO organisation and participation.

### IMPLEMENTATION

#### Components

This service is implemented through four major components:

1. A Background Check  Smart Contract, hosted on Ethereum (BSC).
1. A firewalled, Verification Signing Relay (VSR).
1. A Background Check Web Service for accepting payment and initiating verification (BWS).
1. The Onfido Identity Document Verification service (IDV).

##### Background Check Smart Contract

This is a simple certification contract, implemented in Solidity and deployed on the Ethereum blockchain. The code for this is specified at [1].

The smart contract respects two addresses: *owner* and *delegate*. The former is a “top-level” failsafe key which has full ownership and administrative rights over the contract. It is kept only as a recovery phrase and is stored at a secure third-parity facility. It is never expected to be used. The latter, *delegate*, is a secure account from which transactions may be signed by the Verification Signing Relay.

##### Verification Signing Relay

This service is the security-critical portion of the components hosted by Parity Technologies. It exists as a Node.js module and its code can be found at [https://github.com/paritytech/certifier-website](https://github.com/paritytech/certifier-website).

This service runs on a secure and firewalled server to which no incoming connections (save SSH over an internal private network) are allowed. It is allowed only to receive requests from CWS via secure Redis pubsub messages, verify the requests with IDV and submit final signed transactions to the Ethereum network via a proxy service (securely hosted Parity node).

It monitors the IDV service for identities that have been verified as conforming to the various provisions that were set out above. When such an identity is found, a transaction which affects certification of the Ethereum address that the identity provided is signed by the *delegate* address and published to the blockchain.

##### Background-Check Web-Service

This is a standard-security module implemented as a Node.js service which is able to collect information (the Ethereum address primarily) and payment from a potential person who wishes to gain certification. The code is defined in [https://github.com/paritytech/certifier-website](https://github.com/paritytech/certifier-website).

It fulfills two key tasks: firstly, it initiates the background check processes with the IDV module in a manner resistant to spam/economic-DoS attacks. Secondly, it passes the key for the results of the background check process to the Verification Signing Relay module in order that it can enact the results on chain.

##### Identity Document Verification

This module is a combination of web service and web backend. It is implemented and operated by Onfido Ltd., incorporated and registered in England and Wales (company number 07479524) whose registered office is at 40 Long Acre, Covent Garden, London, WC2E 9LG, United Kingdom ("Onfido"). Parity Technologies has no insight into its implementation, however there are clear guarantees of its operation under contract with Parity Technologies.

The service begins with the authorisation for a particular user to begin the verification process. This is initiated from the Certification Web Service. Once authorised, the user is able to provide their identity document, either as an uploaded image or via their device’s camera. The IDV service then performs the checks listed under “Document Image Check” and “Watchlist Check” on [https://onfido.com/products](https://onfido.com/products). The aggregate of all obtained personal information is then communicated to any service that has the authorisation key, which in this case would be the Verification Signing Relay.

#### Process

* **Peer review**: All code by Parity Technologies which is used in this service has been reviewed by at least one peer in our development team.
* **Open source**: All code by Parity Technologies which is used in this service is open source and may be reviewed by the public at will.
* **Security flaw reporting**: Industry standard processes are in place to ensure security bugs are received, evaluated and acted upon in a timely fashion. A secure mailing address is in place with standard PKI to ensure Parity Technologies receives the information first. Key stakeholders are identified and notified in the case of a grave security issue that has been found “in the wild”. A single point-of-contact and owner are identified within Parity Technologies who can ensure the right people give the issue proper attention. Standard public disclosure templates are used by Parity Technologies in case there is a need to make formal announcement of an issue.
* **Failsafe emergency procedures**: Procedures are in place to recover the system should any device be compromised. A cold *owner* key, stored in text form only and enacted only through an air-gapped cold-wallet signer, is able to replace a compromised *delegate*. The new delegate key may be used to repair the contract back to the state from records contained on the IDV system.
* **Operation Security best practices**: Parity Technologies employs OpSec best practices in its operation and maintenance of the backend services. It strives to ensure all security updates are installed for any software infrastructure. Secret keys are stored on “cold-wallet” devices that do not expose the data to the operating system or software running within it. All VM’s are built with the latest patches and minimum amount of installed services to reduce attack surface.
* **Build and deployment best practices**: Parity Technologies strives for best practices in its build and deployment processes. The latest compilers for Solidity are used; deployment is automated as much as possible in order to re-provision fast in case of emergency. Additional frontend protection is provided by Cloudflare.
* **Open auditing**: Any major user of PICOPS, determined as a user that has demonstrably referred more than 1000 certification requests, is entitled to commision, at their own expense, an independent security audit by a qualified professional, of Parity Technology’s back-end services. For more information, please enquire at picops@parity.io.

### KNOWN RISKS & DEFICIENCIES

No system can be 100% secure and though we take great pride in providing a reliable and secure service, Parity Technologies, providing its systems gratis, can make no guarantees of eventual security.

There are a number of known risks of exploit with the system and deficiencies in how it operates that must be borne by anyone hoping to use the system for their specific purposes.

##### Snapshot Only

The identity verification checks that identities go through happen only at the time of certification. If an identity later gets added to a sanctions watchlist, there is no current mechanism for this to be reflected in the Background Check Smart Contract.

### BIBLIOGRAPHY

1. [https://github.com/paritytech/contracts/blob/master/SimpleCertifier.sol](https://github.com/paritytech/contracts/blob/master/SimpleCertifier.sol)
1. [https://github.com/paritytech/certifier-website](https://github.com/paritytech/certifier-website)
1. [https://onfido.com/products](https://onfido.com/products)
