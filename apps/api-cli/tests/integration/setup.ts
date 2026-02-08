/**
 * Integration Test Setup
 *
 * Provides database connection and cleanup utilities for integration tests.
 * Uses the existing Docker Compose environment (library-postgres).
 *
 * Requirements:
 * - Docker containers must be running: docker-compose up -d
 * - DATABASE_URL environment variable set (or uses default)
 */

import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { sql } from 'drizzle-orm';
import * as schema from '../../src/infrastructure/driven/persistence/drizzle/schema.js';

const { Pool } = pg;
const { books, categories, bookCategories } = schema;

/**
 * Database instance type for integration tests
 * Includes schema for query builder support (db.query.tableName.findFirst())
 */
export type TestDb = NodePgDatabase<typeof schema> & { $client: pg.Pool };

/**
 * Default database URL for integration tests
 * Uses the Docker Compose postgres service
 */
const DEFAULT_DATABASE_URL = 'postgresql://library:library@localhost:5432/library';

/**
 * Creates a database connection for integration tests
 */
export async function createTestDb(): Promise<TestDb> {
  const databaseUrl = process.env['DATABASE_URL'] ?? DEFAULT_DATABASE_URL;
  
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 5, // Limit connections for tests
  });

  // Verify connection
  const client = await pool.connect();
  client.release();

  const db = drizzle(pool, { schema }) as TestDb;
  return db;
}

/**
 * Closes the database connection
 */
export async function closeTestDb(db: TestDb): Promise<void> {
  await db.$client.end();
}

/**
 * Clears all test data from tables
 * Order matters due to foreign key constraints
 */
export async function clearTestData(db: TestDb): Promise<void> {
  // Delete in order: junction tables first, then main tables
  await db.delete(bookCategories);
  await db.delete(books);
  await db.delete(categories);
}

/**
 * Creates a test database wrapper with automatic cleanup
 */
export function createTestContext() {
  let db: TestDb;

  return {
    async setup() {
      db = await createTestDb();
      await clearTestData(db);
      return db;
    },

    async teardown() {
      if (db) {
        await clearTestData(db);
        await closeTestDb(db);
      }
    },

    getDb() {
      return db;
    },
  };
}

/**
 * Generates a valid UUID v4 for tests
 */
export function generateTestUUID(): string {
  return crypto.randomUUID();
}

/**
 * Creates a valid 768-dimension embedding vector for tests
 */
export function generateTestEmbedding(): number[] {
  return Array.from({ length: 768 }, () => Math.random() * 2 - 1);
}

/**
 * Test fixtures for common test data
 */
export const testFixtures = {
  category: {
    id: generateTestUUID(),
    name: 'Test Category',
    description: 'A test category for integration tests',
  },

  book: {
    id: generateTestUUID(),
    title: 'Test Book',
    author: 'Test Author',
    description: 'A test book for integration tests',
    type: 'technical',
    format: 'pdf',
    isbn: '9780132350884',
    available: true,
    path: '/test/path.pdf',
  },
};
