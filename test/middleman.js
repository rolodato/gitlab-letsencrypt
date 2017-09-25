'use strict';

require('dotenv-safe').load();

const options = {
    staging: true,
    middleman: true,
    path: '/',
    domain: process.env.GITLAB_LE_MIDDLEMAN_DOMAIN.split(','),
    repository: process.env.GITLAB_LE_MIDDLEMAN_REPOSITORY,
    token: process.env.GITLAB_LE_MIDDLEMAN_TOKEN,
    email: process.env.GITLAB_LE_EMAIL
};

require('../main')(options);
