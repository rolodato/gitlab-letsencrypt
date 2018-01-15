FROM node:9.4-alpine

RUN apk add --no-cache --virtual build-dependencies \
      build-base \
      python

ENV PATH="/home/node/.npm-global/bin:${PATH}"
ENV NPM_CONFIG_PREFIX=/home/node/.npm-global

USER node

RUN npm install --quiet --production --no-progress -g \
      gitlab-letsencrypt

USER root

RUN apk del build-dependencies

USER node

ENTRYPOINT ["gitlab-le"]
