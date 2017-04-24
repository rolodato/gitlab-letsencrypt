#! /usr/bin/env node

const Promise = require('bluebird');
const readInput = Promise.promisify(require('read'));
const argv = require('yargs').array('domain').argv;
const xtend = require('xtend');
const getCertificate = require('./lib.js');

const read = (options) => (forceReadInput = false) => {
    const validator = options.validator ? options.validator : v => v && v.length > 0;
    const processValue = options.processValue ? options.processValue : v => v;
    const resultPromise = forceReadInput ? readInput(options) : Promise.resolve(argv[options.argument]);
    return resultPromise
        .then(processValue)
        .then(value => {
            if (validator(value)) {
                return value;
            }

            throw new Error();
        })
        .then(value => {
            var result = {};
            result[options.argument] = value;
            return result;
        })
        .catch(() => read(options)(true));
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
        prompt: 'Domain(s) that the cert will be issued for (separated by spaces), e.g. example.com www.example.com foo.example.com:',
        argument: 'domain',
        processValue: v => v === undefined || Array.isArray(v) ? v : v.trim().split(/\s+/),
        validator: v => v !== undefined && v.length > 0 && v.every(item => typeof item === 'string' && item.length > 0)
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
            console.log(`\nSuccess! Go to https://gitlab.com/${options.repository}/pages and create/re-create domain(s) with the following settings:\n`);
            console.log(`Domain(s): ${options.domain.join(', ')}\n`);
            console.log(`Certificate (PEM):\n${certs.cert}\n${certs.ca}\n`);
            console.log(`Key (PEM):\n${certs.key}`);
        });
    })
    .catch(err => console.error(err.detail || err.message || err));
