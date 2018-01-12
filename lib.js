'use strict';
const Promise = require('bluebird');
const ACME = Promise.promisifyAll(require('le-acme-core').ACME.create());
const RSA = Promise.promisifyAll(require('rsa-compat').RSA);
const ms = require('ms');
const request = require('request-promise');
const xtend = require('xtend');
const pki = require('node-forge').pki;
const path = require('path');

const generateRsa = () => RSA.generateKeypairAsync(2048, 65537, {});

const pollUntilDeployed = (url, expectedContent, timeoutMs = 30 * 1000, retries = 10) => {
    if (retries > 0) {
        return request.get({
            url: url,
            simple: false // don't reject on 404
        }).then(res => {
            if (res === expectedContent) {
                return Promise.resolve();
            } else {
                // GitLab CI usually takes 50-80 seconds to build
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
    const gitlabBaseUrl = options.gitlab.replace(/\/+$/, '');
    const gitlabRequestV3 = request.defaults({
        headers: { 'PRIVATE-TOKEN': options.token },
        json: true,
        baseUrl: `${gitlabBaseUrl}/api/v3`
    });
    const gitlabRequestV4 = request.defaults({
        headers: { 'PRIVATE-TOKEN': options.token },
        json: true,
        baseUrl: `${gitlabBaseUrl}/api/v4`
    });
    const gitlabRequest = gitlabRequestV3;

    const getRepository = (name) => {
        return gitlabRequest.get({
            url: `/projects/${name.replace('/','%2F')}`
        }).then(result => {
            if (typeof result.default_branch !== 'string') {
                return Promise.reject('Could not determine the default branch of your repository. This usually happens when your GitLab API token is invalid.');
            } else {
                return result;
            }
        });
    };

    const uploadChallenge = (key, value, repo, domain) => {
        const challengeContent = options.jekyll ?
                `---\nlayout: null\npermalink: /.well-known/acme-challenge/${key}\n---\n${value}` : value;
        // Need to bluebird-ify to use .asCallback()
        return Promise.resolve(gitlabRequest.post({
            url: `/projects/${repo.id}/repository/files`,
            body: {
                file_path: path.posix.resolve('/', options.path, key),
                commit_message: 'Automated Let\'s Encrypt renewal: add challenge',
                branch_name: repo.default_branch,
                content: challengeContent
            }
        })).return([`http://${domain}/.well-known/acme-challenge/${key}`, value]);
    };

    const deleteChallenges = (key, repo) => {
        return Promise.resolve(gitlabRequest.delete({
            url: `/projects/${repo.id}/repository/files`,
            body: {
                file_path: path.posix.resolve('/', options.path, key),
                commit_message: 'Automated Let\'s Encrypt renewal: remove challenge',
                branch_name: repo.default_branch
            }
        }));
    };

    const listPagesDomains = (repo) => {
        return gitlabRequestV4.get({
            url: `/projects/${repo.id}/pages/domains`,
        });
    };

    const createPagesDomain = (repo, domain) => {
        return gitlabRequestV4.post({
            url: `/projects/${repo.id}/pages/domains`,
            form: { domain: domain }
        });
    };

    const updatePagesDomainWithCertificate = (repo, domain, cert) => {
        return gitlabRequestV4.put({
            url: `/projects/${repo.id}/pages/domains/${domain}`,
            form: {
                domain: domain,
                certificate: cert.cert + cert.chain,
                key: cert.privkey
            }
        });
    };

    const createPagesDomains = (repo) => {
        return listPagesDomains(repo).then(pagesDomains => {
            // names of existing domains in gitlab pages
            const pagesDomainsNames = pagesDomains.map(pagesDomain => {
                return pagesDomain.domain;
            });

            // domains that need to be created
            const domainsToCreate = options.domain.filter(domain => {
                return !pagesDomainsNames.includes(domain);
            });

            // promises to create the new domains
            const promises = domainsToCreate.map(domain => {
                return createPagesDomain(repo, domain);
            });

            return Promise.all(promises);
        });
    };

    const updatePagesDomainsWithCertificates = (repo, cert) => {
        const promises = options.domain.map(domain => {
            return updatePagesDomainWithCertificate(repo, domain, cert);
        });

        return Promise.all(promises);
    };

    let deleteChallengesPromise = null;

    return Promise.join(getUrls, generateRsa(), generateRsa(), getRepository(options.repository),
        (urls, accountKp, domainKp, repo) => {
            return createPagesDomains(repo).then(() => {
                return ACME.registerNewAccountAsync({
                    newRegUrl: urls.newReg,
                    email: options.email,
                    accountKeypair: accountKp,
                    agreeToTerms: (tosUrl, cb) => {
                        console.log(`By using Let's Encrypt, you are agreeing to the TOS at ${tosUrl}`);
                        cb(null, true);
                    }
                });
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
                        return (deleteChallengesPromise = deleteChallenges(key, repo)).finally(() => cb(null));
                    }
                });
            }).then((cert) => {
                if (options.auto) {
                    return updatePagesDomainsWithCertificates(repo, cert).return(cert);
                }
                return cert;
            }).then(cert => xtend(cert, {
                domains: options.domain,
                repository: options.repository,
                pagesUrl: `${gitlabBaseUrl}/${options.repository}/pages`,
                notAfter: pki.certificateFromPem(cert.cert).validity.notAfter
            }));
        });
};
