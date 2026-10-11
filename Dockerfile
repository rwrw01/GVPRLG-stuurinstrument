FROM node@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402 AS deps
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci

FROM node@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402 AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# prisma.config.ts laadt DATABASE_URL vóór elke CLI-aanroep, ook voor `generate` dat niet
# daadwerkelijk verbindt — alleen nodig om de config-loader niet te laten falen tijdens de
# build; wordt op runtime (migrator/runner) overschreven door de echte waarde uit de entrypoint.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
RUN npx prisma generate
RUN npm run build

FROM node@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402 AS migrator
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && adduser -S gvprlg -u 1001
COPY --from=builder --chown=gvprlg:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=gvprlg:nodejs /app/prisma ./prisma
COPY --from=builder --chown=gvprlg:nodejs /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=gvprlg:nodejs /app/package.json ./package.json
USER gvprlg

FROM node@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402 AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -g 1001 -S nodejs && adduser -S gvprlg -u 1001
COPY --from=builder /app/public ./public
COPY --from=builder --chown=gvprlg:nodejs /app/.next/standalone ./
COPY --from=builder --chown=gvprlg:nodejs /app/.next/static ./.next/static
USER gvprlg
EXPOSE 8080
ENV PORT=8080
ENV HOSTNAME=0.0.0.0
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8080/api/healthz || exit 1
CMD ["node", "server.js"]
