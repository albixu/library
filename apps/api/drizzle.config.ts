import { defineConfig } from 'drizzle-kit';

/**
 * Drizzle Kit configuration for database migrations
 *
 * Usage:
 *   npm run db:generate  # Generate migration from schema changes
 *   npm run db:migrate   # Apply pending migrations
 */
export default defineConfig({
  schema: './src/infrastructure/driven/persistence/drizzle/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://library:library@localhost:5432/library',
  },
});
