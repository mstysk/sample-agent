ARG ALPINE_VERSION=3.22.1

FROM alpine:${ALPINE_VERSION}

RUN apk update && apk add --no-cache \
  nodejs \
  npm

WORKDIR /app
COPY . /app

ENTRYPOINT ["npm", "run", "start"]
