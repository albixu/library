import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration for integration tests
 *
 * Integration tests run against real infrastructure (PostgreSQL, Ollama)
 * and require Docker containers to be running.
 *
 * Usage:
 *   npm run test:integration
 *
 * Prerequisites:
 *   docker-compose up -d
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    // Integration tests need more time due to real DB operations
    testTimeout: 30000,
    hookTimeout: 30000,
    // Run tests sequentially to avoid DB conflicts
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    // Retry failed tests once (network issues, etc.)
    retry: 1,
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
