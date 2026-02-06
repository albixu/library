# ================================
# PRODUCTION DOCKERFILE
# Multi-stage build for optimized image
# ================================

# ----- Stage 1: Builder -----
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (better cache)
COPY package*.json ./
RUN npm ci

# Copy source code
COPY tsconfig.json ./
COPY drizzle.config.ts ./
COPY src ./src

# Build TypeScript
RUN npm run build

# Prune dev dependencies
RUN npm prune --production

# ----- Stage 2: Production -----
FROM node:20-alpine AS production

# Security: run as non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy built artifacts and production dependencies
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./

# Copy drizzle migrations
COPY --from=builder --chown=nodejs:nodejs /app/src/infrastructure/driven/persistence/drizzle/migrations ./dist/infrastructure/driven/persistence/drizzle/migrations

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose API port
EXPOSE 3000

# Switch to non-root user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start the API server
CMD ["node", "dist/server.js"]
