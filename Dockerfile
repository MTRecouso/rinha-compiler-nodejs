FROM node:18.12.1-alpine
WORKDIR /var/app
COPY src/ .
CMD node index.js /var/rinha/source.rinha.json > output.js && node output.js
