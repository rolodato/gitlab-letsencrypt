'use strict';
const Promise = require('bluebird');
const ACME = Promise.promisifyAll(require('le-acme-core').ACME.create());
const RSA = Promise.promisifyAll(require('rsa-compat').RSA);
const ms = require('ms');
const request = require('request-promise');
const xtend = require('xtend');
const pki = require('node-forge').pki;
const path = require('path');
const { URL } = require('url');

const generateRsa = () => RSA.generateKeypairAsync(2048, 65537, {});

const pollUntilDeployed = (url, expectedContent, timeoutMs = 30 * 1000, attempts = 30) => {
    if (attempts > 0) {
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
                    pollUntilDeployed(url, expectedContent, timeoutMs, attempts - 1));
            }
        });
    } else {
        return Promise.reject(`Timed out while waiting for challenge file at ${url}`);
    }
};

module.exports = (options) => {
    const getUrls = ACME.getAcmeUrlsAsync(options.production ? ACME.productionServerUrl : ACME.stagingServerUrl);
    const repoUrl = new URL(options.repository);
    const gitlabBaseUrl = repoUrl.origin;
    const gitlabRequest = request.defaults({
        headers: { 'PRIVATE-TOKEN': options.token },
        json: true,
        baseUrl: `${gitlabBaseUrl}/api/v4`
    });

    const getRepository = (name) => {
        return gitlabRequest.get({
            url: `/projects/${encodeURIComponent(name.replace('/', ''))}`
        });
    };

    const uploadChallenge = (key, value, repo, domain) => {
        const challengeContent = options.jekyll ?
                `---\nlayout: null\npermalink: /.well-known/acme-challenge/${key}\n---\n${value}` : value;
        // Need to bluebird-ify to use .asCallback()
        const filePath = encodeURIComponent(path.posix.resolve('/', options.path, key));
        return Promise.resolve(gitlabRequest.post({
            url: `/projects/${repo.id}/repository/files/${filePath}`,
            body: {
                commit_message: 'Automated Let\'s Encrypt renewal: add challenge',
                branch: repo.default_branch,
                content: challengeContent,
                author_name: 'gitlab-le'
            }
        })).return([`http://${domain}/.well-known/acme-challenge/${key}`, value]);
    };

    const deleteChallenges = (key, repo) => {
        const filePath = encodeURIComponent(path.posix.resolve('/', options.path, key));
        return Promise.resolve(gitlabRequest.delete({
            url: `/projects/${repo.id}/repository/files/${filePath}`,
            body: {
                commit_message: 'Automated Let\'s Encrypt renewal: remove challenge',
                branch: repo.default_branch,
                author_name: 'gitlab-le'
            }
        }));
    };

    const listPagesDomains = (repo) => {
        return gitlabRequest.get({
            url: `/projects/${repo.id}/pages/domains`,
        });
    };

    const createPagesDomain = (repo, domain) => {
        return gitlabRequest.post({
            url: `/projects/${repo.id}/pages/domains`,
            form: { domain: domain }
        });
    };

    const updatePagesDomainWithCertificate = (repo, domain, cert) => {
        return gitlabRequest.put({
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

    return Promise.join(getUrls, generateRsa(), generateRsa(), getRepository(repoUrl.pathname),
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
                            .tap(res => console.log(`Uploaded challenge file, polling until it is available at ${res[0]}`))
                            .spread(pollUntilDeployed)
                            .asCallback(cb);
                    },
                    removeChallenge: (hostname, key, cb) => {
                        return (deleteChallengesPromise = deleteChallenges(key, repo)).finally(() => cb(null));
                    }
                });
            }).tap(cert =>
                options.production ? updatePagesDomainsWithCertificates(repo, cert) : cert
            ).then(cert => xtend(cert, {
                domains: options.domain,
                repository: options.repository,
                pagesUrl: `${gitlabBaseUrl}/${options.repository}/pages`,
                notAfter: pki.certificateFromPem(cert.cert).validity.notAfter
            }));
        });
};
