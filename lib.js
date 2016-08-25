'use strict';
const Promise = require('bluebird');
const LeTinyCore = require('letiny-core');
const LeCore = Promise.promisifyAll(LeTinyCore);
const LeCrypto = Promise.promisifyAll(LeCore.leCrypto);
const ms = require('ms');
const request = require('request-promise');

const getUrls = LeCore.getAcmeUrlsAsync(LeCore.productionServerUrl);
const generateRsa = () => LeCrypto.generateRsaKeypairAsync(2048, 65537);

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

var certCache = {};
const certStore = {
    set: function (hostname, certs, cb) {
        certCache[hostname] = certs;
        cb(null);
    }, get: function (hostname, cb) {
        cb(null, certCache[hostname]);
    }, remove: function (hostname, cb) {
        delete certCache[hostname];
        cb(null);
    }
};

module.exports = certStore;

module.exports = (options) => {
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
                branch_name: 'master',
                content: value
            }
        })).return([`http://${domain}/.well-known/acme-challenge/${key}`, value]);
    };

    const deleteChallenges = (key, repo) => {
        return Promise.resolve(gitlabRequest.delete({
            url: `projects/${repo.id}/repository/files`,
            body: {
                file_path: `public/.well-known/acme-challenge/${key}`,
                commit_message: 'Automated Let\'s Encrypt renewal',
                branch_name: 'master'
            }
        }));
    };
    return Promise.join(getUrls, generateRsa(), generateRsa(), getRepository(options.repository),
        (urls, accountKp, domainKp, repo) => {
            return LeCore.registerNewAccountAsync({
                newRegUrl: urls.newReg,
                email: options.email,
                accountPrivateKeyPem: accountKp.privateKeyPem,
                agreeToTerms: (tosUrl, cb) => {
                    console.log(`By using Let's Encrypt, you are agreeing to the TOS at ${tosUrl}`);
                    cb(null, true);
                }
            }).then(() => {
                return LeCore.getCertificateAsync({
                    newAuthzUrl: urls.newAuthz,
                    newCertUrl: urls.newCert,
                    domainPrivateKeyPem: domainKp.privateKeyPem,
                    accountPrivateKeyPem: accountKp.privateKeyPem,
                    domains: [options.domain],
                    setChallenge: (hostname, key, value, cb) => {
                        return uploadChallenge(key, value, repo, options.domain)
                            .tap(res => console.log(`Uploaded challenge file, waiting for it to be available at ${res[0]}`))
                            .spread(pollUntilDeployed)
                            .asCallback(cb);
                    },
                    removeChallenge: (hostname, key, cb) => {
                        return deleteChallenges(key, repo).asCallback(cb);
                    }
                });
            });
        });
};
