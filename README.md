# Crowdsale Website

## How to run?

- Make sure Parity is running on default settings.

- Install [Redis](https://redis.io), run `redis-server` with all default settings.

- Start the backend service:
    ```
    $ cd backend
    $ npm i
    $ npm start
    ```

- (Optional) Start the queue consumer service:
    ```
    $ cd backend
    $ npm run start:consumer
    ```

- Start the frontend dev server:
    ```
    $ cd frontend
    $ npm i
    $ npm start
    ```

- Open [http://localhost:8080](http://localhost:8080) in the browser.

## Overview

*Disclaimer:* some relationships were skipped for simplicity.

```
           .----------------------.
           |                      |
           |    Queue Consumer    |
           |                      |
           '----------------------'
             ^             ^   |
             |             |   |
             |     Balance |   | Send queued TXs
  Read Queue |     updates |   | if balance is topped
             |  each block |   |
             |             |   v
  .------------.        .-------------------.             .~~~~~~~~~~.
  |            |        |                   |   MAGIC    (            )
  |   Redis    |        |    Parity Node    | <=======> (   Ethereum   )
  |            |        |                   |            (            )
  '------------'        '-------------------'             '~~~~~~~~~~'
             ^             |   ^
             |      Status |   |
 Queue TX w/ |     updates |   | Send TX w/
insufficient |  each block |   | sufficient
     balance |             |   | balance
             |             v   |
          .----------------------.
          |                      |
          |       Backend        |
          |                      |
          '----------------------'

```

**Queue Consumer** and **Backend** share code, but should be run as separate
processes, ideally different machines in production.
