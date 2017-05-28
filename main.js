'use strict';
const getCertificate = require('./lib');

module.exports = (args) => {
    return getCertificate(args).then(certs => {
        console.log(`Success! Go to https://gitlab.com/${certs.repository}/pages and create/re-create domain(s) with the following settings:\n`);
        console.log(`Domain(s): ${certs.domains.join(', ')}\n`);
        console.log(`Certificate (PEM):\n${certs.cert}${certs.ca}`);
        console.log(`Key (PEM):\n${certs.key}`);
        console.log(`This certificate expires on ${certs.notAfter}. You will need to repeat these steps at some time before this date.`);
        console.log('If you\'d like to improve this situation, please join the discussion at https://gitlab.com/gitlab-org/gitlab-ce/issues/28996');
    }).catch(err => {
        console.error(err.detail || err.message || err);
        process.exit(1);
    });
};
