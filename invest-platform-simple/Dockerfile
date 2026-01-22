FROM node:22-alpine
LABEL "language"="nodejs"
LABEL "framework"="next.js"

WORKDIR /app

COPY invest-platform-simple/package*.json ./

RUN npm install

COPY invest-platform-simple/ .

RUN npm run build

RUN npm prune --production

EXPOSE 8080

CMD ["npm", "run", "start"]