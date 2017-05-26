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
    console.log(`Certificate (PEM):\n${certs.cert}\n${certs.ca}\n`);
    console.log('Key (PEM): ...');
}).catch(err => {
    console.error(err.detail || err.message || err);
    process.exit(1);
});
