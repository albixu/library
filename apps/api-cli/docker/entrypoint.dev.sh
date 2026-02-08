#!/bin/sh
# ================================
# Development Entrypoint Script
# Runs as root to fix permissions, then drops to nodejs user
# ================================

set -e

# Fix permissions for vitest cache directory
# The node_modules volume may have been created by root, so .vite directory
# needs correct ownership for nodejs user to write test results
if [ -d "/app/node_modules" ]; then
    mkdir -p /app/node_modules/.vite/vitest
    chown -R nodejs:nodejs /app/node_modules/.vite
fi

# Drop privileges and execute the main command as nodejs user
exec su-exec nodejs "$@"
