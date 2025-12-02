FROM node:20-alpine

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

# Copy all package files for workspace resolution
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/api/package.json ./apps/api/
COPY apps/ingestion/package.json ./apps/ingestion/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
COPY packages/db/package.json ./packages/db/

# Install all dependencies
RUN pnpm install

# Copy source code
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY packages/db ./packages/db
COPY apps/web ./apps/web

# Build shared package and db package
RUN pnpm --filter @mctrack/shared build
RUN pnpm --filter @mctrack/db build

ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1
EXPOSE 3000

# Run in dev mode with hot reload
CMD ["pnpm", "--filter", "@mctrack/web", "dev"]
