'use strict';
const Promise = require('bluebird');
const ACME = Promise.promisifyAll(require('le-acme-core').ACME.create());
const RSA = Promise.promisifyAll(require('rsa-compat').RSA);
const ms = require('ms');
const request = require('request-promise');
const xtend = require('xtend');
const pki = require('node-forge').pki;

const generateRsa = () => RSA.generateKeypairAsync(2048, 65537, {});

const pollUntilDeployed = (url, expectedContent, timeoutMs = 15 * 1000, retries = 10) => {
    if (retries > 0) {
        return request.get({
            url: url,
            simple: false // don't reject on 404
        }).then(res => {
            if (res === expectedContent) {
                return Promise.resolve();
            } else {
                console.log(`Could not find challenge file. Retrying in ${ms(timeoutMs)}...`);
                return Promise.delay(timeoutMs).then(() =>
                    pollUntilDeployed(url, expectedContent, timeoutMs * 2, retries - 1));
            }
        });
    } else {
        return Promise.reject(`Timed out while waiting for challenge file at ${url}`);
    }
};

module.exports = (options) => {
    const getUrls = ACME.getAcmeUrlsAsync(options.staging ? ACME.stagingServerUrl : ACME.productionServerUrl);
    const gitlabRequest = request.defaults({
        headers: { 'PRIVATE-TOKEN': options.token },
        json: true,
        baseUrl: 'https://gitlab.com/api/v3'
    });

    const getRepository = (name) => {
        return gitlabRequest.get({
            url: `/projects/${name.replace('/','%2F')}`
        });
    };

    const uploadChallenge = (key, value, repo, domain) => {
        // Need to bluebird-ify to use .asCallback()
        return Promise.resolve(gitlabRequest.post({
            url: `/projects/${repo.id}/repository/files`,
            body: {
                file_path: `public/.well-known/acme-challenge/${key}`,
                commit_message: 'Automated Let\'s Encrypt renewal',
                branch_name: repo.default_branch,
                content: value
            }
        })).return([`http://${domain}/.well-known/acme-challenge/${key}`, value]);
    };

    const deleteChallenges = (key, repo) => {
        return Promise.resolve(gitlabRequest.delete({
            url: `/projects/${repo.id}/repository/files`,
            body: {
                file_path: `public/.well-known/acme-challenge/${key}`,
                commit_message: 'Automated Let\'s Encrypt renewal',
                branch_name: repo.default_branch
            }
        }));
    };

    let deleteChallengesPromise = null;

    return Promise.join(getUrls, generateRsa(), generateRsa(), getRepository(options.repository),
        (urls, accountKp, domainKp, repo) => {
            return ACME.registerNewAccountAsync({
                newRegUrl: urls.newReg,
                email: options.email,
                accountKeypair: accountKp,
                agreeToTerms: (tosUrl, cb) => {
                    console.log(`By using Let's Encrypt, you are agreeing to the TOS at ${tosUrl}`);
                    cb(null, true);
                }
            }).then(() => {
                return ACME.getCertificateAsync({
                    newAuthzUrl: urls.newAuthz,
                    newCertUrl: urls.newCert,
                    domainKeypair: domainKp,
                    accountKeypair: accountKp,
                    domains: options.domain,
                    setChallenge: (hostname, key, value, cb) => {
                        return Promise.resolve(deleteChallengesPromise)
                            .then(() => uploadChallenge(key, value, repo, hostname))
                            .tap(res => console.log(`Uploaded challenge file, waiting for it to be available at ${res[0]}`))
                            .spread(pollUntilDeployed)
                            .asCallback(cb);
                    },
                    removeChallenge: (hostname, key, cb) => {
                        return (deleteChallengesPromise = deleteChallenges(key, repo)).asCallback(cb);
                    }
                }).then(cert => xtend(cert, {
                    domains: options.domain,
                    repository: options.repository,
                    notAfter: pki.certificateFromPem(cert.cert).validity.notAfter
                }));
            });
        });
};
