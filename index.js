#! /usr/bin/env node

const Promise = require('bluebird');
const readInput = Promise.promisify(require('read'));
const argv = require('yargs').argv;
const xtend = require('xtend');
const getCertificate = require('./lib.js');

const read = (options) => () => {
    const validator = options.validator ? options.validator : v => v && v.length > 0;
    const argument = typeof argv[options.argument] === 'string' ? argv[options.argument] : undefined;
    const resultPromise = argument ? Promise.resolve(argument) : readInput(options);
    return resultPromise.then(value => {
        if (validator(value)) {
            var result = {};
            result[options.argument] = value;
            return result;
        } else {
            return read(options)();
        }
    });
};

const reduceSequential = (reducer, initialValue, accum = initialValue) => (promiseFns) => {
    if (promiseFns.length === 0) {
        return Promise.resolve(accum);
    } else {
        return promiseFns[0]()
            .then(res => reducer(accum, res))
            .then(newAcc => reduceSequential(reducer, initialValue, newAcc)(promiseFns.slice(1)));
    }
};

const readSequential = reduceSequential(xtend, {});

const inputs = [
    read({
        prompt: 'Email address for your Let\'s Encrypt account:',
        argument: 'email',
        validator: v => v.match(/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i)
    }),
    read({
        prompt: 'Domain that the cert will be issued for, e.g. example.com:',
        argument: 'domain'
    }),
    read({
        prompt: 'GitLab pages repository identifier, e.g. foo/example.gitlab.io:',
        argument: 'repository'
    }),
    read({
        prompt: 'GitLab personal access token (https://gitlab.com/profile/personal_access_tokens):',
        argument: 'token',
        silent: true
    })
];

readSequential(inputs)
    .then(options => {
        return getCertificate(options).then(certs => {
            console.log(`\nSuccess! Go to https://gitlab.com/${options.repository}/pages and create/update a domain with the following settings:\n`);
            console.log(`Domain: ${options.domain}\n`);
            console.log(`Certificate (PEM):\n${certs.cert}\n${certs.ca}\n`);
            console.log(`Key (PEM):\n${certs.key}`);
        });
    })
    .catch(err => console.error(err.detail || err.message || err));
