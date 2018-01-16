FROM node:9.4-alpine

LABEL \
      maintainer="Tobias L. Maier <me@tobiasmaier.info>" \
      org.label-schema.description="CLI Tool to easily generate a Let's Encrypt certificate for GitLab.com hosted pages" \
      org.label-schema.docker.cmd.help="docker container run --rm rolodato/gitlab-letsencrypt --help" \
      org.label-schema.docker.cmd="docker container run --rm gitlab-le:dev --domain example.com --email info@example.com --repository https://gitlab.com/my-user/my-repo --token GITLAB_TOKEN" \
      org.label-schema.docker.schema-version="1.0" \
      org.label-schema.name="gitlab-letsencrypt" \
      org.label-schema.url="https://github.com/rolodato/gitlab-letsencrypt" \
      org.label-schema.usage="https://github.com/rolodato/gitlab-letsencrypt/blob/master/README.markdown" \
      org.label-schema.vcs-url="https://github.com/rolodato/gitlab-letsencrypt" \
      org.label-schema.vendor="Tobias L. Maier <me@tobiasmaier.info>"

ENV PATH="/home/node/.npm-global/bin:${PATH}"
ENV NPM_CONFIG_PREFIX=/home/node/.npm-global

RUN apk add --no-cache --virtual build-dependencies \
      build-base \
      python \
  && su node -c "npm install --quiet --production --no-progress -g gitlab-letsencrypt" \
  && apk del build-dependencies

USER node

ENTRYPOINT ["gitlab-le"]
