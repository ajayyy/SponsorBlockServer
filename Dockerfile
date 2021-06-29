FROM node:14
WORKDIR /usr/src/app
COPY package.json .
COPY package-lock.json .
COPY tsconfig.json .
COPY src src
RUN npm ci
RUN npm run tsc
RUN mkdir databases
COPY databases/*.sql databases/
COPY entrypoint.sh .
EXPOSE 8080
CMD ./entrypoint.sh
