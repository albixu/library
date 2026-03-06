# ================================
# PRODUCTION DOCKERFILE
# Multi-stage build for optimized image
# ================================

# ----- Stage 1: Builder -----
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (better cache)
COPY package*.json ./
RUN npm ci --ignore-scripts

# Copy source code, scripts and drizzle migrations
COPY tsconfig.json ./
COPY tsconfig.scripts.json ./
COPY drizzle.config.ts ./
COPY src ./src
COPY scripts ./scripts
COPY drizzle ./drizzle

# Build TypeScript (including scripts for production seed)
RUN npm run build:prod

# Prune dev dependencies
RUN npm prune --production

# ----- Stage 2: Production -----
FROM node:20-alpine AS production

# Security: Add metadata labels
LABEL maintainer="Library Team" \
      org.opencontainers.image.title="Library API" \
      org.opencontainers.image.description="Personal digital library management API" \
      org.opencontainers.image.vendor="Library" \
      org.opencontainers.image.source="https://github.com/library/api"

# Security: Update packages and remove cache
RUN apk update && \
    apk upgrade --no-cache && \
    rm -rf /var/cache/apk/*

# Security: Create non-root user with specific UID/GID
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs -h /app -s /sbin/nologin

WORKDIR /app

# Copy built artifacts and production dependencies with correct ownership
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./

# Copy drizzle migrations (needed for auto-migrate on startup)
COPY --from=builder --chown=nodejs:nodejs /app/drizzle ./drizzle
COPY --from=builder --chown=nodejs:nodejs /app/drizzle.config.ts ./

# Create data directory for seed data (books.json will be mounted or copied)
RUN mkdir -p /app/data && chown nodejs:nodejs /app/data

# Security: Set proper file permissions (read-only for app files)
RUN chmod -R 555 /app/dist && \
    chmod -R 555 /app/node_modules && \
    chmod -R 555 /app/drizzle && \
    chmod 444 /app/package.json && \
    chmod 444 /app/drizzle.config.ts

# Security: Create tmp directory with proper permissions for runtime needs
RUN mkdir -p /app/tmp && chown nodejs:nodejs /app/tmp && chmod 755 /app/tmp

# Environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    # Security: Disable npm update check
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    # Security: Reduce npm audit noise in production
    NPM_CONFIG_AUDIT=false \
    # Performance: Reduce memory footprint
    NODE_OPTIONS="--max-old-space-size=256"

# Security: Drop all capabilities
# Note: This is informational - actual capability dropping happens at runtime

# Expose API port
EXPOSE 3000

# Switch to non-root user BEFORE any runtime operations
USER nodejs

# Health check with proper timeout settings
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))" || exit 1

# Security: Use exec form to avoid shell injection and ensure proper signal handling
CMD ["node", "dist/src/server.js"]
