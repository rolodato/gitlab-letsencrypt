'use strict';
const getCertificate = require('./lib');

module.exports = (args) => {
    return getCertificate(args).then(certs => {
        console.log('\nSuccess!\n');
        if (!args.auto) {
            console.log(`Go to ${certs.pagesUrl} and create/re-create domain(s) with the following settings:\n`);
            console.log(`Domain(s): ${certs.domains.join(', ')}\n`);
            console.log(`Certificate (PEM):\n${certs.cert}${certs.ca}`);
            console.log(`Key (PEM):\n${certs.key}`);
            console.log(`This certificate expires on ${certs.notAfter}. You will need to repeat these steps at some time before this date.`);
        }
    }).catch(err => {
        console.error(err.detail || err.message || err);
        process.exit(1);
    });
};
