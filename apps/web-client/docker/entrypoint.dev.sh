#!/bin/sh
# ================================
# Development Entrypoint Script - Web Client
# Runs as root to fix permissions, then drops to nodejs user
# ================================

set -e

# Fix permissions for Angular cache directory
# The .angular directory may need correct ownership for nodejs user
if [ -d "/app/.angular" ]; then
    chown -R nodejs:nodejs /app/.angular 2>/dev/null || true
fi

# Fix permissions for node_modules cache directories
if [ -d "/app/node_modules" ]; then
    # Ensure .cache directories have correct permissions
    mkdir -p /app/node_modules/.cache
    chown -R nodejs:nodejs /app/node_modules/.cache 2>/dev/null || true
fi

# Ensure Playwright cache has correct permissions
if [ -d "/home/nodejs/.cache" ]; then
    chown -R nodejs:nodejs /home/nodejs/.cache 2>/dev/null || true
fi

# Drop privileges and execute the main command as nodejs user
exec su-exec nodejs "$@"
