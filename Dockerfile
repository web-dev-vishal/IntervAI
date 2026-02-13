FROM node:20-alpine

WORKDIR /app

# Install wget for healthcheck
RUN apk add --no-cache wget

COPY package*.json ./

RUN npm ci --only=production

COPY . .

RUN mkdir -p /app/exports

EXPOSE 8000

CMD ["node", "index.js"]