FROM node:24-alpine AS builder
RUN apk add --no-cache --virtual .build-deps python3 make g++
COPY package.json package-lock.json tsconfig.json entrypoint.sh ./
COPY src src
RUN npm ci && npm run tsc

FROM node:24-alpine AS app
WORKDIR /usr/src/app
RUN apk add --no-cache git postgresql-client
COPY --from=builder ./node_modules ./node_modules
COPY --from=builder ./dist ./dist
COPY ./.git/ ./.git
COPY entrypoint.sh .
COPY databases/*.sql databases/
EXPOSE 8080
CMD ./entrypoint.sh
