const config = require('config');
const querystring = require('querystring');
const fetch = require('node-fetch');

const { secret } = config.get('recaptcha');

async function validate (stoken) {
  return fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
    },
    body: querystring.stringify({
      response: stoken,
      secret
    })
  })
    .then((r) => r.json())
    .then((response) => {
      if (!response || !response.success) {
        console.warn('failed recaptcha', response);
        throw new Error('Failed the recaptcha challenge');
      }
    });
}

module.exports = {
  validate
};
