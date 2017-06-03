'use strict';

require('dotenv-safe').load();

const assert = require('assert');

const options = {
    staging: true,
    path: '/public/.well-known/acme-challenge',
    domain: process.env.GITLAB_LE_DOMAIN.split(','),
    repository: process.env.GITLAB_LE_REPOSITORY,
    token: 'lololol',
    email: process.env.GITLAB_LE_EMAIL
};

require('../lib')(options)
    .then(() => process.exit(1))
    .catch(error => {
        console.error(error);
        const expected = 'Could not determine the default branch of your repository. This usually happens when your GitLab API token is invalid.';
        assert.deepEqual(error, expected);
    });
