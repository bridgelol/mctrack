FROM node:20-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/ingestion/package.json ./apps/ingestion/
COPY packages/shared/package.json ./packages/shared/
COPY packages/db/package.json ./packages/db/

# Install dependencies
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/ingestion/node_modules ./apps/ingestion/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules

COPY . .

# Build packages
RUN pnpm --filter @mctrack/shared build
RUN pnpm --filter @mctrack/db build
RUN pnpm --filter @mctrack/ingestion build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 ingestion

# Copy built files
COPY --from=builder --chown=ingestion:nodejs /app/apps/ingestion/dist ./apps/ingestion/dist
COPY --from=builder --chown=ingestion:nodejs /app/apps/ingestion/package.json ./apps/ingestion/
COPY --from=builder --chown=ingestion:nodejs /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder --chown=ingestion:nodejs /app/packages/shared/package.json ./packages/shared/
COPY --from=builder --chown=ingestion:nodejs /app/packages/db/dist ./packages/db/dist
COPY --from=builder --chown=ingestion:nodejs /app/packages/db/package.json ./packages/db/
COPY --from=builder --chown=ingestion:nodejs /app/node_modules ./node_modules

USER ingestion

EXPOSE 4001

ENV PORT 4001

CMD ["node", "apps/ingestion/dist/index.js"]
