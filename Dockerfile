FROM node:12
WORKDIR /usr/src/app
COPY package.json .
RUN npm install
COPY index.js .
COPY src .
COPY entrypoint.sh .
EXPOSE 8080
ENTRYPOINT ./entrypoint.sh