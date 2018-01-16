FROM node:9.4-alpine

ENV PATH="/home/node/.npm-global/bin:${PATH}"
ENV NPM_CONFIG_PREFIX=/home/node/.npm-global

RUN apk add --no-cache --virtual build-dependencies \
      build-base \
      python \
  && su node -c "npm install --quiet --production --no-progress -g gitlab-letsencrypt" \
  && apk del build-dependencies

USER node

ENTRYPOINT ["gitlab-le"]
