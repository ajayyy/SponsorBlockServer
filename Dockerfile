FROM node:12
WORKDIR /usr/src/app
COPY package.json .
RUN npm install
COPY index.ts .
COPY src src
RUN mkdir databases
COPY databases/*.sql databases/
COPY entrypoint.sh .
EXPOSE 8080
CMD ./entrypoint.sh