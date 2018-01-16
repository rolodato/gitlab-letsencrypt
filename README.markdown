# gitlab-letsencrypt [![Build Status](https://travis-ci.org/rolodato/gitlab-letsencrypt.svg?branch=master)](https://travis-ci.org/rolodato/gitlab-letsencrypt) [![Docker Automated build](https://img.shields.io/docker/automated/rolodato/gitlab-letsencrypt.svg)](https://hub.docker.com/r/rolodato/gitlab-letsencrypt/) [![Docker Pulls](https://img.shields.io/docker/pulls/rolodato/gitlab-letsencrypt.svg)](https://hub.docker.com/r/rolodato/gitlab-letsencrypt/) [![GitHub stars](https://img.shields.io/github/stars/rolodato/gitlab-letsencrypt.svg?style=social&label=Star)](https://github.com/rolodato/gitlab-letsencrypt)


Command-line tool to generate a [Let's Encrypt](https://letsencrypt.org) certificate for use with [GitLab Pages](https://pages.gitlab.io/).

## Installation

```sh
npm install -g gitlab-letsencrypt
```

## Usage

**Important**: To avoid being rate-limited by Let's Encrypt, do not use the `--production` option until you have tested everything works OK without it.
By default, `gitlab-le` will use [Let's Encrypt's staging environment](https://letsencrypt.org/docs/staging-environment/), which does not issue real certificates but has very generous rate limits.

```sh
gitlab-le \
--email      example@example.com                        `# REQUIRED - Let's Encrypt email address` \
--domain     example.com www.example.com                `# REQUIRED - Domain(s) that the cert will be issued for (separated by spaces)` \
--repository https://gitlab.com/gitlab_user/gitlab_repo `# REQUIRED - Full URL to your GitLab repository` \
--token      ...                                        `# REQUIRED - GitLab personal access token, see https://gitlab.com/profile/personal_access_tokens` \
--production                                            `# OPTIONAL - Obtain a real certificate instead of a dummy one and configure your repository to use it`
--path                                                  `# OPTIONAL - Absolute path in your repository where challenge files should be uploaded`
--jekyll                                                `# OPTIONAL - Upload challenge files with a Jekyll-compatible YAML front matter` \
```

See `gitlab-le --help` for more details.

## Example

```
$ gitlab-le --email example@example.com --token ... --domain example.com www.example.com --repository https://example.com/user/my-repo --production
By using Let's Encrypt, you are agreeing to the TOS at https://letsencrypt.org/documents/LE-SA-v1.2-November-15-2017.pdf
Uploaded challenge file, waiting for it to be available at http://example.com/.well-known/acme-challenge/35wHSN4YSNjqh5iz5gULxQ4X30cV7vRA_S929uiiNCc
Could not find challenge file. Retrying in 30s...
Could not find challenge file. Retrying in 1m...
Could not find challenge file. Retrying in 2m...
Uploaded challenge file, waiting for it to be available at http://www.example.com/.well-known/acme-challenge/50U-eARIh2OYLQN22oe4lib6_ESnwLPhCMMkBlUY1BI
Could not find challenge file. Retrying in 30s...
Could not find challenge file. Retrying in 1m...
Could not find challenge file. Retrying in 2m...

Success! Your GitLab page has been configured to use an HTTPS certificate obtained from Let's Encrypt.
Try it out: https://example.com https://www.example.com (GitLab might take a few minutes to start using your certificate for the first time)
This certificate expires on Sat Apr 14 2018 03:09:06 GMT+0100 (BST). You will need to run gitlab-le again at some time before this date.
```

## Docker image

There is also a [Docker image](https://hub.docker.com/r/rolodato/gitlab-letsencrypt/) available.
This means the Command-line tool can be used without installing all the dependencies required to run the application.

Example:
```text
docker container run --rm -it rolodato/gitlab-letsencrypt \
  --domain example.com \
  --email me@example.com \
  --repository https://gitlab.com/my/repo \
  --jekyll \
  --path /acme-challenge \
  --token $GITLAB_TOKEN
```

## Automatic renewal of the certificate

Let's Encrypt certificates have a comparatively short life-span.
They need to be renewed regularly.

Use the [GitLab Pipeline Schedule](https://docs.gitlab.com/ce/user/project/pipelines/schedules.html) feature to automate the renewal process.

```yaml
ssl:renew certificate:
  image:
    name: rolodato/gitlab-letsencrypt
    entrypoint: ["/bin/sh", "-c"]
  variables:
    GIT_STRATEGY: none
  before_script: []
  script: |-
    gitlab-le \
      --domain example.com \
      --email $LETS_ENCRYPT_EMAIL \
      --jekyll \
      --path /acme-challenge \
      --production \
      --repository $CI_PROJECT_URL \
      --token $GITLAB_TOKEN
  only:
    - schedules
```

Add the following variables to your GitLab project: `LETS_ENCRYPT_EMAIL` and your secret `GITLAB_TOKEN`.

Consider to add `except: [schedules]` to all other jobs in your `.gitlab-ci.yml` file, as they will be anyway triggered when gitlab-le adds and removes the ACME challenge.

Schedule then a new pipeline to run for example every month.
See <https://docs.gitlab.com/ce/user/project/pipelines/schedules.html> for details.

## How it works

`gitlab-le` uses the [ACME HTTP Challenge](https://tools.ietf.org/html/draft-ietf-acme-acme-09#section-8.3) to prove ownership of a given set of domains.

1. Requests a challenge from Let's Encrypt using the provided email address for the specified domains. One challenge file is generated per domain
2. Each challenge file is uploaded to your GitLab repository using GitLab's API, which commits to your repository
3. The challenge URL is repeatedly polled until the challenge file is made available. GitLab Pages take a while to update after changes are committed
4. If Let's Encrypt was able to verify the challenge file, a certificate for that domain is issued
5. Each challenge file is removed from your GitLab repository by committing to it through the GitLab API
6. If `--production` was set, your GitLab page is configured to use the issued certificate

Because Let's Encrypt is a fully automated certificate authority, all issued certificates expire in 90 days.
A fresh certificate can be obtained at any time by running `gitlab-le` again, as long as you are within Let's Encrypt's [rate limits](https://letsencrypt.org/docs/rate-limits/).

## Security

`gitlab-le` does not save or log anything to disk.
The GitLab access token is used to upload the challenge file to your repository and to delete it once the challenge is completed.

Even though challenge files are deleted from your repository after a challenge is completed, they are still visible in the repository's commit history.
`gitlab-le` does not rewrite your repository's commit history to hide this.

Challenge files do not have any value to attackers without the RSA keys used to initiate a Let's Encrypt challenge, which are generated on each run of `gitlab-le`.
For more details, refer to the [Integrity of Authorizations sections of the ACME specification](https://tools.ietf.org/html/draft-ietf-acme-acme-09#section-10.2).

## Motivation

Let's Encrypt certificates expire every 90 days - this is by design to take advantage of automated renewals using [ACME](https://tools.ietf.org/html/draft-ietf-acme-acme-01).
However, GitLab does not provide a way to automatically renew certificates, so this process must be done manually.

## Automation

Since 10.2, GitLab provides an API to configure HTTPS certificates on a GitLab page, which means `gitlab-le` can be configured to obtain new certificates when your existing ones are about to expire.
