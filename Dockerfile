FROM node:10.15.3 as source
WORKDIR /src/build-your-own-radar
COPY package.json ./
RUN npm i -g npm@6.9.0
RUN echo "optional = false" > .npmrc
RUN npm install
COPY *.js *.json ./
COPY ./src ./src/
RUN npm run build

FROM nginx:1.15.9
WORKDIR /opt/build-your-own-radar
COPY --from=source /src/build-your-own-radar/dist .
COPY ./radars/*.csv ./radars/
COPY default.template /etc/nginx/conf.d/default.conf
CMD ["nginx", "-g", "daemon off;"]