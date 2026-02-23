# ================================
# PRODUCTION DOCKERFILE - Web Client
# Multi-stage build for optimized nginx image
# ================================

# ----- Stage 1: Builder -----
FROM node:20-alpine AS builder

# Security: Add metadata labels
LABEL maintainer="Library Team" \
      org.opencontainers.image.title="Library Web Client Builder" \
      org.opencontainers.image.description="Build stage for Library Angular Web Client"

WORKDIR /app

# Install dependencies first (better cache)
COPY package*.json ./
RUN npm ci --ignore-scripts

# Copy source code
COPY angular.json tsconfig*.json ./
COPY src ./src
COPY public ./public

# Build argument for API URL (injected at build time)
ARG API_URL=http://localhost:3000
ENV API_URL=${API_URL}

# Build Angular app for production
RUN npm run build -- --configuration production

# ----- Stage 2: Production (Nginx) -----
FROM nginx:alpine AS production

# Security: Add metadata labels
LABEL maintainer="Library Team" \
      org.opencontainers.image.title="Library Web Client" \
      org.opencontainers.image.description="Personal digital library management web client" \
      org.opencontainers.image.vendor="Library" \
      org.opencontainers.image.source="https://github.com/albixu/library"

# Security: Update packages and remove cache
RUN apk update && \
    apk upgrade --no-cache && \
    rm -rf /var/cache/apk/*

# Security: Create non-root user
RUN addgroup -g 1001 -S nginx-user && \
    adduser -S nginx-user -u 1001 -G nginx-user -h /app -s /sbin/nologin

# Copy built Angular app from builder stage
COPY --from=builder /app/dist/web-client/browser /usr/share/nginx/html

# Copy nginx configuration
COPY docker/nginx.conf /etc/nginx/nginx.conf

# Security: Set proper file permissions (read-only for static files)
RUN chmod -R 555 /usr/share/nginx/html && \
    chown -R nginx-user:nginx-user /usr/share/nginx/html

# Security: Create required nginx directories with proper permissions
RUN mkdir -p /var/cache/nginx /var/run /var/log/nginx && \
    chown -R nginx-user:nginx-user /var/cache/nginx /var/run /var/log/nginx && \
    chmod -R 755 /var/cache/nginx /var/run /var/log/nginx

# Security: Make nginx.conf readable
RUN chmod 444 /etc/nginx/nginx.conf

# Expose HTTP port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -q --spider http://localhost/health || exit 1

# Note: Running as root is required for nginx to bind to port 80
# The nginx worker processes run as nginx-user after startup
CMD ["nginx", "-g", "daemon off;"]
