FROM alpine:3.12

RUN apk update && apk --no-cache add -U  nodejs nodejs-npm && mkdir /volante-template
ADD src /volante-template/src
ADD package.json /volante-template
ADD config.json /volante-template

RUN cd /volante-template && npm i

ENTRYPOINT node /volante-template/src/index.js