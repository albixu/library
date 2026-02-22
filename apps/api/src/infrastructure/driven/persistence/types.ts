/**
 * Database Client Type Definitions
 *
 * Provides shared type definitions for the Drizzle ORM database client.
 * This ensures type safety when passing the database instance to repositories.
 */

import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from './drizzle/schema.js';

/**
 * Type-safe database client using node-postgres driver with our schema.
 *
 * This type represents the Drizzle ORM database instance configured with:
 * - node-postgres (pg) driver
 * - Our application schema (books, authors, categories, types, etc.)
 *
 * Usage:
 * ```typescript
 * import type { DatabaseClient } from './types.js';
 *
 * const db: DatabaseClient = drizzle(pool, { schema });
 * const repository = new PostgresBookRepository(db);
 * ```
 */
export type DatabaseClient = NodePgDatabase<typeof schema>;
