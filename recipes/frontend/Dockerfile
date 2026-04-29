FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM alpine:3.20

RUN mkdir -p /shared-dist

COPY --from=build /app/dist /dist

CMD ["sh", "-c", "rm -rf /shared-dist/* && cp -a /dist/. /shared-dist/"]
