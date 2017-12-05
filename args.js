'use strict';

const yargs = require('yargs');
module.exports = yargs
    .strict()
    .help()
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
        type: 'string',
        demandOption: true
    }).option('token', {
        describe: 'GitLab personal access token (https://gitlab.com/profile/personal_access_tokens)',
        type: 'string',
        demandOption: true
    }).option('jekyll', {
        describe: 'Upload challenge files with a Jekyll-compatible YAML front matter (see https://jekyllrb.com/docs/frontmatter)',
        type: 'boolean',
        default: false        
    }).option('middleman', {
        describe: 'Upload challenge files',
        type: 'boolean',
        default: false
    }).option('path', {
        describe: 'Absolute path in your repository where challenge files will be uploaded. Your .gitlab-ci.yml file must be configured to serve the contents of this directory under http://YOUR_SITE/.well-known/acme-challenge',
        type: 'string',
        default: '/public'
    }).option('staging', {
        describe: 'Use Let\'s Encrypt\'s staging environment (does not issue real certificates - use only for testing)',
        type: 'boolean',
        default: false
    }).example('$0 --domain example.com www.example.com --email rolodato@example.com --repository foo/example.gitlab.io --token abc123', 'Simple build where all files are served from public/ inside your repository')
    .example('$0 --jekyll --path / --domain example.com --email rolodato@example.com --repository foo/example.gitlab.io --token abc123', 'Jekyll website that serves all valid files in your repository\'s root directory')
    .example('$0 --middleman --path / --domain example.com --email rolodato@example.com --repository foo/example.gitlab.io --token abc123', 'Middleman website that serves all valid files in your repository\'s root directory')
    .wrap(yargs.terminalWidth())
    .check(argv => {
        const empty = Object.keys(argv).filter(key => key !== '_' && argv[key].length == 0);
        if (empty.length > 0) {
            console.error(`Missing required arguments: ${empty.join(', ')}`);
            process.exit(1);
        } else {
            return true;
        }
    }).argv;
