'use strict';
const getCertificate = require('./lib');

module.exports = (args) => {
    return getCertificate(args).then(certs => {
        console.log(`\nSuccess! Go to https://gitlab.com/${certs.repository}/pages and create/re-create domain(s) with the following settings:\n`);
        console.log(`Domain(s): ${certs.domain.join(', ')}\n`);
        console.log(`Certificate (PEM):\n${certs.cert}\n${certs.ca}\n`);
        console.log(`Key (PEM):\n${certs.key}`);
    }).catch(err => {
        console.error(err.detail || err.message || err);
        process.exit(1);
    });
};
