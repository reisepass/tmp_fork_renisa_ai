# Base stage
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Build stage
FROM base AS builder

WORKDIR /app

# Copy all files first
COPY . /app
WORKDIR /app

# Install dependencies for the entire workspace
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Build dependencies and the API app (skip DTS generation in Docker)
RUN pnpm turbo build --filter=api...

# Runtime stage
FROM node:22-alpine AS runtime
RUN corepack enable pnpm
RUN apk add --no-cache gcompat aws-cli jq

WORKDIR /app

# Create non-root user first
RUN addgroup -g 1001 -S nodejs && \
  adduser -S mastra -u 1001

# Copy everything from builder with correct ownership
COPY --from=builder --chown=mastra:nodejs /app/apps/api/.mastra/output/ ./

# Copy bootstrap script
COPY --from=builder --chown=mastra:nodejs /app/apps/api/scripts/bootstrap.sh /usr/local/bin/bootstrap.sh
RUN chmod +x /usr/local/bin/bootstrap.sh

# Copy AWS Lambda adapter
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.9.0 /lambda-adapter /opt/extensions/lambda-adapter

USER mastra

ENV PORT=8080
ENV NODE_ENV=production
ENV READINESS_CHECK_PATH="/api"

EXPOSE 8080

WORKDIR /app
ENTRYPOINT ["/usr/local/bin/bootstrap.sh"]
CMD ["node", "--import=./instrumentation.mjs", "index.mjs"]