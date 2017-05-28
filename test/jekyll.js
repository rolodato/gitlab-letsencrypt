'use strict';

require('dotenv-safe').load();

const options = {
    staging: true,
    jekyll: true,
    path: '/',
    domain: process.env.GITLAB_LE_JEKYLL_DOMAIN.split(','),
    repository: process.env.GITLAB_LE_JEKYLL_REPOSITORY,
    token: process.env.GITLAB_LE_JEKYLL_TOKEN,
    email: process.env.GITLAB_LE_EMAIL
};

require('../main')(options);
