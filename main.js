'use strict';
const getCertificate = require('./lib');

module.exports = (args) => {
    return getCertificate(args).then(certs => {
        process.stdout.write('Success! ');
        if (!args.production) {
            console.log(`A test certificate was successfully obtained for the following domains: ${certs.domains.join(', ')}`);
            console.log(`To obtain a production certificate, run gitlab-le again and add the --production flag.`);
        } else {
            console.log(`Your GitLab page has been configured to use an HTTPS certificate obtained from Let's Encrypt.`);
            console.log(`Try it out: ${certs.domains.map(c => `https://${c}`).join(' ')} (GitLab might take a few minutes to start using your certificate for the first time)\n`);
            console.log(`This certificate expires on ${certs.notAfter}. You will need to run gitlab-le again at some time before this date.`);
        }
    }).catch(err => {
        console.error(err.detail || err.message || err);
        process.exit(1);
    });
};
