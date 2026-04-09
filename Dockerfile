FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/build             ./build
COPY --from=builder /app/package.json      ./
COPY --from=builder /app/package-lock.json ./
COPY --from=builder /app/scripts           ./scripts
COPY docker-entrypoint.sh ./
RUN npm ci --omit=dev && chmod +x docker-entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
