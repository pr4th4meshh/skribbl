# ── Stage 1: build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace manifests for layer caching
COPY package*.json ./
COPY shared/package*.json ./shared/
COPY server/package*.json ./server/

RUN npm ci --ignore-scripts

# Build shared package
COPY shared/tsconfig.json ./shared/
COPY shared/src ./shared/src/
RUN cd shared && npm run build

# Build server
COPY server/tsconfig.json ./server/
COPY server/prisma.config.ts ./server/
COPY server/prisma ./server/prisma/
COPY server/src ./server/src/
RUN cd server && DATABASE_URL=postgresql://dummy npx prisma generate && npm run build

# ── Stage 2: runtime
FROM node:20-alpine AS runtime

ENV NODE_ENV=production

WORKDIR /app

COPY package*.json ./
COPY shared/package*.json ./shared/
COPY server/package*.json ./server/
COPY server/prisma ./server/prisma/

RUN npm ci --omit=dev --ignore-scripts && \
    addgroup -S app && adduser -S app -G app

COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/generated ./server/generated

USER app

EXPOSE 6969

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:6969/health || exit 1

CMD ["node", "server/dist/index.js"]
