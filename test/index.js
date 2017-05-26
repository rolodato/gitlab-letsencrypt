'use strict';

require('dotenv-safe').load();
const getCertificate = require('../lib');

const options = {
    staging: true,
    domain: process.env.GITLAB_LE_DOMAIN.split(','),
    repository: process.env.GITLAB_LE_REPOSITORY,
    token: process.env.GITLAB_LE_TOKEN,
    email: process.env.GITLAB_LE_EMAIL
};

getCertificate(options).then(certs => {
    console.log(`\nSuccess! Go to https://gitlab.com/${certs.repository}/pages and create/re-create domain(s) with the following settings:\n`);
    console.log(`Domain(s): ${certs.domains.join(', ')}\n`);
    console.log(`Certificate (PEM):\n${certs.cert}\n${certs.ca}\n`);
    console.log(`Key (PEM):\n${certs.key}`);
}).catch(err => {
    console.error(err.detail || err.message || err);
    process.exit(1);
});
