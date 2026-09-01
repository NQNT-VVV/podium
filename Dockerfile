# syntax=docker/dockerfile:1

# Debian plutot qu'Alpine : better-sqlite3 publie des binaires precompiles
# pour la glibc, sur musl il faudrait compiler.

# --- Dependances completes (le build Next a besoin de TypeScript) ----------
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- Build Next -----------------------------------------------------------
FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# --- Dependances de production seules -------------------------------------
FROM node:22-bookworm-slim AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# --- Image finale ---------------------------------------------------------
FROM node:22-bookworm-slim
ENV NODE_ENV=production \
    PORT=3000 \
    METRICS_PORT=9464 \
    DATA_DIR=/app/data \
    NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY package.json next.config.mjs ./
COPY server ./server
COPY scripts ./scripts
COPY public ./public

# Base SQLite : monter un volume ici, sinon comptes et classements partent avec le conteneur.
RUN mkdir -p /app/data && chown -R node:node /app/data

USER node
EXPOSE 3000 9464
VOLUME ["/app/data"]

HEALTHCHECK --interval=30s --timeout=4s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/index.js"]
