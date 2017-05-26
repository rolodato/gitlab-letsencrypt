# gitlab-letsencrypt

Command-line tool to generate a [Let's Encrypt](https://letsencrypt.org) certificate for use with [GitLab Pages](https://pages.gitlab.io/).

## Installation

```sh
npm install -g gitlab-letsencrypt
```

## Usage

All parameters are required:

```sh
gitlab-le \
--email      example@example.com         `# Let's Encrypt email address` \
--domain     example.com www.example.com `# Domain(s) that the cert will be issued for (separated by spaces)` \
--repository gitlab_user/gitlab_repo     `# Namespaced repository identifier` \
--token      ...                         `# GitLab personal access token, see https://gitlab.com/profile/personal_access_tokens`
```

## Example

```
$ gitlab-le --email rolodato@example.com --repository example/example.gitlab.io --token ... --domain example.com www.example.com
By using Let's Encrypt, you are agreeing to the TOS at https://letsencrypt.org/documents/LE-SA-v1.0.1-July-27-2015.pdf
Uploaded challenge file, waiting for it to be available at http://example.com/.well-known/acme-challenge/lLqa_7sLPQzz102c2KIc3pqMevUyM_Ru92whx6w1C-4
Could not find challenge file. Retrying in 15s...
Could not find challenge file. Retrying in 30s...
Could not find challenge file. Retrying in 1m...

Success! Go to https://gitlab.com/example/example.gitlab.io/pages and create/re-create domain(s) with the following settings:

Domain(s): example.com, www.example.com

Certificate (PEM):
-----BEGIN CERTIFICATE-----
...
-----END CERTIFICATE-----

Key (PEM):
-----BEGIN RSA PRIVATE KEY-----
...
-----END RSA PRIVATE KEY-----
```

## What this does

1. Requests a challenge from Let's Encrypt using the provided email address for the specified domains. One challenge file is generated per domain
2. Each challenge file is uploaded to your GitLab repository using GitLab's API, which commits to your repository
3. The challenge URL is repeatedly polled until the challenge file is made available. GitLab Pages take a while to update after changes are committed
4. If Let's Encrypt was able to verify the challenge file, a certificate for that domain is issued
5. Each challenge file is removed from your GitLab repository by committing to it through the GitLab API

## Security

`gitlab-le` does not save or log anything to disk.
The GitLab access token is used to upload the challenge file to your repository and to delete it once the challenge is completed.

Even though challenge files are deleted from your repository after a challenge file is deleted, they are still visible in the repository's commit history.
In any case, challenge files do not have any value after a challenge has been completed, so this is not a security risk.

## Motivation

Let's Encrypt certificates expire every 90 days - this is by design to take advantage of automated renewals using [ACME](https://tools.ietf.org/html/draft-ietf-acme-acme-01).
However, GitLab does not provide a way to automatically renew certificates, so this process must be done manually.

## Automation

GitLab does not provide an API to update domains or certificates for a Page, so these must be updated manually through the UI.
If you like this tool and want full automation (e.g. stick this in a cron job and forget about it), [let GitLab know](https://gitlab.com/pages/pages.gitlab.io/issues/23)!
