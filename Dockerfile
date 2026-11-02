# syntax=docker/dockerfile:1.7
# ─── SalesReport AI — single-service production image (API + built web app) ───

FROM node:22-bookworm-slim AS base
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# ---- install all dependencies (incl. dev) for building ----
FROM base AS deps
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/server/package.json apps/server/prisma.config.ts apps/server/
COPY apps/server/prisma apps/server/prisma
COPY apps/web/package.json apps/web/
RUN npm ci --include=dev --no-audit --no-fund

# ---- build web (Vite) + server (tsup) ----
FROM deps AS build
COPY . .
RUN npm run build

# ---- production dependencies only (server workspace) ----
FROM base AS prod-deps
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/server/package.json apps/server/prisma.config.ts apps/server/
COPY apps/server/prisma apps/server/prisma
COPY apps/web/package.json apps/web/
RUN npm ci --omit=dev --workspace @salesreport/server --no-audit --no-fund \
  && npm cache clean --force

# ---- runtime ----
FROM base AS runtime
ENV NODE_ENV=production \
    PORT=4000 \
    HOST=0.0.0.0 \
    DATABASE_URL=file:/app/data/salesreport.db \
    SERVE_WEB=true
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/package.json ./package.json
COPY --from=prod-deps /app/packages ./packages
COPY --from=prod-deps /app/apps/server ./apps/server
COPY --from=build /app/apps/server/dist ./apps/server/dist
COPY --from=build /app/apps/server/assets ./apps/server/assets
COPY --from=build /app/apps/web/dist ./apps/web/dist
RUN mkdir -p /app/data && chown -R node:node /app/data
USER node
WORKDIR /app/apps/server
EXPOSE 4000
VOLUME ["/app/data"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
