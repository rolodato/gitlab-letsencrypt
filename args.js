'use strict';

module.exports = require('yargs')
    .strict()
    .option('domain', {
        describe: 'Domain(s) that the cert will be issued for (separated by spaces)',
        type: 'array',
        demandOption: true
    }).option('email', {
        describe: 'Email address for your Let\'s Encrypt account',
        type: 'string',
        demandOption: true
    }).option('repository', {
        describe: 'GitLab pages repository identifier',
        example: 'foo/example.gitlab.io',
        type: 'string',
        demandOption: true
    }).option('token', {
        describe: 'GitLab personal access token (https://gitlab.com/profile/personal_access_tokens)',
        type: 'string',
        demandOption: true
    }).check(argv => {
        const empty = Object.keys(argv).filter(key => key !== '_' && argv[key].length == 0);
        if (empty.length > 0) {
            console.error(`Missing required arguments: ${empty.join(', ')}`);
            process.exit(1);
        } else {
            return true;
        }
    }).argv;
