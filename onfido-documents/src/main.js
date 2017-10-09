const fetch = require('node-fetch');
const cheerio = require('cheerio');
const { countries: countryData } = require('country-data');
const levenshtein = require('fast-levenshtein');

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

const onfidoDocs = [
  {
    value: 'passport',
    label: 'Passport'.toLowerCase()
  },
  {
    value: 'driving_licence',
    label: 'Driving Licence'.toLowerCase()
  },
  {
    value: 'driving_licence',
    label: 'Driving License'.toLowerCase()
  },
  {
    value: 'national_identity_card',
    label: 'Identity Card'.toLowerCase()
  }
];

const manualMap = {
  'Bolivia': 'BOL',
  'Bosnia and Herzegovina': 'BIH',
  'British Virgin Islands': 'VIR',
  'Cape Verde': 'CPV',
  'Congo': 'COG',
  'Congo, Democratic Republic of the': 'COD',
  'Georgia': 'GEO',
  'Iran': 'IRN',
  'Lichenstein': 'LIE',
  'Macao, Special Administrative Region of China': 'MAC',
  'Macedonia': 'MKD',
  'Russia': 'RUS',
  'Saint Helena': 'SHN',
  'Saint Vincent and Grenadines': 'VCT',
  'Syrian Arab Republic (Syria)': 'SYR',
  'Taiwan, Republic of China': 'TWN',
  'Timor-Leste': 'TLS',
  'Turkey': 'TUR',
  'United States of America': 'USA',
  'Venezuela': 'VEN',
  'Virgin Islands, US': 'VIR'
};

async function main () {
  let data = await fetchData();
  const found = [];

  let countries = countryData.all
    .filter((c) => c.alpha3)
    .filter((c) => c.name);

  filter((country, name) => country.name === name);
  filter((country, name) => levenshtein.get(country.name, name, { useCollator: true }) <= 1);

  if (data.length > 0) {
    console.error('Some countries have not been matched:', data.map(({ name }) => name));
    process.exit(1);
  }

  const results = found.reduce((res, { name, docs, country }) => {
    res[country.alpha3] = {
      name,
      documents: parseDocs(docs),
      iso2: country.alpha2,
      iso3: country.alpha3
    };

    return res;
  }, {});

  console.log(JSON.stringify(results, null, 2));

  function filter (fn) {
    data = data.filter(({ name, docs }) => {
      if (manualMap[name]) {
        const country = countryData[manualMap[name]];

        console.warn(`found "${name}" instead of "${country.name}"`);
        found.push({ name, docs, country });
        return false;
      }

      const countryIndex = countries.findIndex((country) => fn(country, name));

      if (countryIndex < 0) {
        return true;
      }

      const country = countries[countryIndex];

      // Remove the found country
      countries = countries.slice(0, countryIndex).concat(countries.slice(countryIndex + 1, countries.length));

      found.push({ name, docs, country });
      return false;
    });
  }
}

function parseDocs (docs) {
  return docs
    .map((doc) => {
      const l = doc.toLowerCase();
      const onfidoDoc = onfidoDocs.find((d) => d.label === l || l.includes(d.label) || d.label.includes(l));

      if (!onfidoDoc) {
        console.warn('could not find document', doc);
        return null;
      }

      const special = /\*$/.test(doc);

      return {
        value: onfidoDoc.value,
        label: doc,
        special
      };
    })
    .filter((d) => d);
}

async function fetchData () {
  const resp = await fetch('https://info.onfido.com/supported-documents');
  const html = await resp.text();
  const $ = cheerio.load(html);
  const data = [];

  $('table tbody tr').each((_, element) => {
    const nameElt = $(element).find('td').get(0);
    const docsElt = $(element).find('td').get(1);

    if (!nameElt || !docsElt) {
      return;
    }

    const name = $(nameElt).text();
    const docsTxt = $(docsElt).text();
    const docsMatch = docsTxt.match(/^(.+) and (.+)$/);

    const docs = docsMatch
      ? docsMatch[1].split(', ').concat(docsMatch[2])
      : [ docsTxt ];

    data.push({ name, docs });
  });

  return data;
}
