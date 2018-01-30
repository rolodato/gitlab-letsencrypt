'use strict';
const getCertificate = require('./lib');

module.exports = (args) => {
    return getCertificate(args)
        .then(result => {
            if (!result.needsRenewal) {
                console.log(`All domains (${result.domains.join(', ')}) have a valid certificate (expiration in more than 30 days)`);
                return;
            }
            process.stdout.write('Success! ');

            if (!args.production) {
                console.log(`A test certificate was successfully obtained for the following domains: ${result.domains.join(', ')}`);
                console.log(`To obtain a production certificate, run gitlab-le again and add the --production option.`);
            } else {
                console.log(`Your GitLab page has been configured to use an HTTPS certificate obtained from Let's Encrypt.`);
                console.log(`Try it out: ${result.domains.map(c => `https://${c}`).join(' ')} (GitLab might take a few minutes to start using your certificate for the first time)\n`);
                console.log(`This certificate expires on ${result.notAfter}. You will need to run gitlab-le again at some time before this date.`);
            }
        }).catch(err => {
            console.error(err.detail || err.message || err);
            process.exit(1);
        });
};
