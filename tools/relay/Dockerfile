FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY server.mjs ./

ENV PORT=13080
ENV HOST=0.0.0.0
ENV RELAY_TOKEN=jackdsh-relay-secret-token

EXPOSE 13080
CMD ["node", "server.mjs"]
