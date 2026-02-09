import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration for end-to-end tests
 *
 * E2E tests validate the system from a user's perspective:
 * - HTTP tests: Real API requests to running Fastify server
 * - CLI tests: Actual CLI commands executed as child processes
 *
 * Usage:
 *   npm run test:e2e
 *
 * Prerequisites:
 *   docker-compose up -d
 *
 * These tests are slower than unit/integration tests because:
 * - They start a real HTTP server
 * - They execute CLI commands as child processes
 * - They generate embeddings via Ollama (can take 5-10s per call)
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/e2e/**/*.test.ts'],
    // E2E tests need significantly more time due to:
    // - Server startup
    // - CLI process spawning
    // - Ollama embedding generation (~10s per call)
    testTimeout: 60000,
    hookTimeout: 60000,
    // Run tests sequentially to avoid port/DB conflicts
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    // No retries for E2E - failures should be investigated
    retry: 0,
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
