# gitlab-letsencrypt

Command-line tool to generate a [Let's Encrypt](https://letsencrypt.org) certificate for use with [GitLab Pages](https://pages.gitlab.io/).

## Installation

```sh
npm install -g gitlab-letsencrypt
```

## Usage

`gitlab-le` can be used interactively:

```sh
gitlab-le
```

or as part of a script.
Any omitted parameters will be prompted for interactively:

```sh
gitlab-le \
--email      example@example.com     `# Let's Encrypt email address` \
--domain     example.com             `# Domain that the cert will be issued for` \
--repository gitlab_user/gitlab_repo `# Namespaced repository identifier` \
--token      ...                     `# GitLab personal access token, see https://gitlab.com/profile/personal_access_tokens`
```

## Example

<details>
<summary>Expand this section for example usage and output.</summary>
```
$ gitlab-le --email rolodato@example.com --repository example/example.gitlab.io --token ... --domain example.com
By using Let's Encrypt, you are agreeing to the TOS at https://letsencrypt.org/documents/LE-SA-v1.0.1-July-27-2015.pdf
Uploaded challenge file, waiting for it to be available at http://example.com/.well-known/acme-challenge/lLqa_7sLPQzz102c2KIc3pqMevUyM_Ru92whx6w1C-4
Could not find challenge file. Retrying in 15s...
Could not find challenge file. Retrying in 30s...
Could not find challenge file. Retrying in 1m...

Success! Go to https://gitlab.com/example/example.gitlab.io/pages and create/update a domain with the following settings:

Domain: example.com

Certificate (PEM):
-----BEGIN CERTIFICATE-----
...
-----END CERTIFICATE-----

Key (PEM):
-----BEGIN RSA PRIVATE KEY-----
...
-----END RSA PRIVATE KEY-----
```
</details>

## Security

`gitlab-le` does not save or log anything to disk.
The GitLab access token is used to upload the challenge file to your repository and to delete it once the challenge is completed.

## Motivation

Let's Encrypt certificates expire every 90 days - this is by design to take advantage of automated renewals using [ACME](https://tools.ietf.org/html/draft-ietf-acme-acme-01).
However, GitLab does not provide a way to automatically renew certificates, so this process must be done manually.

## Automation

GitLab does not provide an API to update domains or certificates for a Page, so these must be updated manually through the UI.
If you like this tool and want full automation (e.g. stick this in a cron job and forget about it), [let GitLab know](https://gitlab.com/pages/pages.gitlab.io/issues/23)!
