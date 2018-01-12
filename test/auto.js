'use strict';

require('dotenv-safe').load();

const options = {
    auto: true,
    staging: false,
    path: '/public/.well-known/acme-challenge',
    domain: process.env.GITLAB_LE_DOMAIN.split(','),
    repository: process.env.GITLAB_LE_REPOSITORY,
    token: process.env.GITLAB_LE_TOKEN,
    email: process.env.GITLAB_LE_EMAIL,
    gitlab: process.env.GITLAB_LE_GITLAB
};

require('../main')(options);
