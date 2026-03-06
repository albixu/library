#!/bin/sh
# ================================
# Development Entrypoint Script
# Runs as root to fix permissions, then drops to nodejs user
# Optionally seeds the database on first run if AUTO_SEED=true
# ================================

set -e

# Fix permissions for vitest cache directory
# The node_modules volume may have been created by root, so .vite directory
# needs correct ownership for nodejs user to write test results
if [ -d "/app/node_modules" ]; then
    mkdir -p /app/node_modules/.vite/vitest
    chown -R nodejs:nodejs /app/node_modules/.vite
fi

# Auto-seed database if enabled and database is empty
if [ "$AUTO_SEED" = "true" ]; then
    echo "AUTO_SEED is enabled. Checking if database needs seeding..."
    
    # Wait for database to be ready (healthcheck should handle this, but be safe)
    sleep 2
    
    # Check if books table is empty by counting rows
    # Uses the DATABASE_URL environment variable
    BOOK_COUNT=$(su-exec nodejs node -e "
        const { Pool } = require('pg');
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        pool.query('SELECT COUNT(*) as count FROM books')
            .then(r => { console.log(r.rows[0].count); pool.end(); })
            .catch(e => { console.log('ERROR'); pool.end(); process.exit(1); });
    " 2>/dev/null || echo "ERROR")
    
    if [ "$BOOK_COUNT" = "ERROR" ]; then
        echo "Could not check database. Skipping auto-seed."
    elif [ "$BOOK_COUNT" = "0" ]; then
        echo "Database is empty. Running seed script..."
        
        # Check if books.json exists
        if [ -f "/app/docs/db/books.json" ]; then
            # Run the seed script as nodejs user
            su-exec nodejs npx tsx scripts/seed-database.ts || {
                echo "Warning: Seed script failed. Continuing with server startup..."
            }
        else
            echo "Warning: /app/docs/db/books.json not found. Skipping seed."
        fi
    else
        echo "Database already contains $BOOK_COUNT books. Skipping seed."
    fi
fi

# Drop privileges and execute the main command as nodejs user
exec su-exec nodejs "$@"
