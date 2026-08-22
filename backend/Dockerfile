FROM node:24.14.0-alpine

WORKDIR /app

COPY backend/package*.json ./
RUN npm ci

COPY backend/. .

EXPOSE 3000

CMD ["npm", "run", "dev"]
