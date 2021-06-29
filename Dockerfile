FROM node:14-alpine as builder
RUN apk add --no-cache --virtual .build-deps python make g++
COPY package.json package-lock.json tsconfig.json entrypoint.sh ./
COPY src src
RUN npm ci && npm run tsc

FROM node:14-alpine as app
WORKDIR /usr/src/app
COPY --from=builder node_modules .
COPY --from=builder dist ./dist
COPY entrypoint.sh .
COPY databases/*.sql databases/
EXPOSE 8080
CMD ./entrypoint.sh
