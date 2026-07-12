FROM node:22-alpine AS build

WORKDIR /app
ARG EXPO_PUBLIC_API_URL=https://agrarium-backend-production.up.railway.app/api/v1
ENV EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL

COPY package*.json ./
RUN npm ci

COPY . .
RUN test -n "$EXPO_PUBLIC_API_URL"
RUN npm run build:web

FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY server.js ./
COPY --from=build /app/dist ./dist

EXPOSE 3000
CMD ["node", "server.js"]
