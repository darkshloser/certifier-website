# Certifier Website

## How to run?

- Make sure Parity is running on default settings.

- Install [Redis](https://redis.io), run `redis-server` with all default settings.

- Start the backend service:
    ```
    $ cd backend
    $ npm i
    $ npm start
    ```

- Start the certifier service:
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

- Open [http://localhost:8081](http://localhost:8081) in the browser.
