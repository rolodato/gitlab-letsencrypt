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
Any omitted parameters will be prompted for:

```sh
gitlab-le \
  --email      # Let's Encrypt email address
  --domain     # Domain that the cert will be issued for, e.g. example.com
  --repository # Namespaced repository identifier, i.e. gitlab_username/repo_name
  --token      # GitLab personal access token, see https://gitlab.com/profile/personal_access_tokens
```

## Example

<details>
<summary>Click here to see an example usage and output.</summary>
Testing.
</details>

## Security

`gitlab-le` does not save or log anything to disk.
The GitLab access token is used to upload the challenge file to your repository.
