FROM node:12
WORKDIR /usr/src/app
COPY package.json .
RUN npm install
COPY index.js .
COPY src src
COPY entrypoint.sh .
EXPOSE 8080
CMD ./entrypoint.sh