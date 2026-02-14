/**
 * E2E Test Setup
 *
 * Provides utilities for end-to-end testing:
 * - Fastify server lifecycle management
 * - Database cleanup between tests
 * - CLI execution helpers
 * - Test fixtures
 *
 * Requirements:
 * - Docker containers must be running: docker-compose up -d
 * - Ollama must have the embedding model loaded
 */

import { spawn, ChildProcess, execFile } from 'child_process';
import { promisify } from 'util';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import type { FastifyInstance } from 'fastify';
import * as schema from '../../src/infrastructure/driven/persistence/drizzle/schema.js';
import { createServer } from '../../src/infrastructure/driver/http/server.js';
import { CreateBookUseCase } from '../../src/application/use-cases/CreateBookUseCase.js';
import { OllamaEmbeddingService } from '../../src/infrastructure/driven/embedding/OllamaEmbeddingService.js';
import { PostgresBookRepository } from '../../src/infrastructure/driven/persistence/PostgresBookRepository.js';
import { PostgresCategoryRepository } from '../../src/infrastructure/driven/persistence/PostgresCategoryRepository.js';
import { PostgresTypeRepository } from '../../src/infrastructure/driven/persistence/PostgresTypeRepository.js';
import { PostgresAuthorRepository } from '../../src/infrastructure/driven/persistence/PostgresAuthorRepository.js';
import { noopLogger } from '../../src/application/ports/Logger.js';

const { Pool } = pg;
const { books, categories, bookCategories, bookAuthors, authors } = schema;

/**
 * Database instance type for E2E tests
 */
export type TestDb = NodePgDatabase<typeof schema> & { $client: pg.Pool };

/**
 * Default URLs for E2E tests (Docker Compose environment)
 * When running inside Docker, use service names; when running locally, use localhost
 */
const DEFAULT_DATABASE_URL = process.env['DATABASE_URL'] ?? 'postgresql://library:library@postgres:5432/library';
const DEFAULT_OLLAMA_URL = process.env['OLLAMA_BASE_URL'] ?? process.env['OLLAMA_URL'] ?? 'http://ollama:11434';
const DEFAULT_OLLAMA_MODEL = 'nomic-embed-text';

/**
 * Server configuration
 */
const E2E_SERVER_PORT = 3001; // Different port to avoid conflicts
const E2E_SERVER_HOST = '127.0.0.1';
export const E2E_BASE_URL = `http://${E2E_SERVER_HOST}:${E2E_SERVER_PORT}`;

/**
 * Creates a database connection for E2E tests
 */
export async function createTestDb(): Promise<TestDb> {
  const databaseUrl = process.env['DATABASE_URL'] ?? DEFAULT_DATABASE_URL;

  const pool = new Pool({
    connectionString: databaseUrl,
    max: 5,
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
 */
export async function clearTestData(db: TestDb): Promise<void> {
  // Order matters due to FK constraints
  await db.delete(bookCategories);
  await db.delete(bookAuthors);
  await db.delete(books);
  await db.delete(categories);
  await db.delete(authors);
  // Note: types table has seed data, don't delete it
}

/**
 * Creates a fully configured Fastify server for E2E testing
 */
export async function createTestServer(db: TestDb): Promise<FastifyInstance> {
  const ollamaUrl = process.env['OLLAMA_URL'] ?? DEFAULT_OLLAMA_URL;
  const ollamaModel = process.env['OLLAMA_MODEL'] ?? DEFAULT_OLLAMA_MODEL;

  // Create adapters
  const embeddingService = new OllamaEmbeddingService({
    baseUrl: ollamaUrl,
    model: ollamaModel,
    timeoutMs: 30000,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bookRepository = new PostgresBookRepository(db as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const categoryRepository = new PostgresCategoryRepository(db as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typeRepository = new PostgresTypeRepository(db as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const authorRepository = new PostgresAuthorRepository(db as any);

  // Create use case
  const createBookUseCase = new CreateBookUseCase({
    bookRepository,
    categoryRepository,
    typeRepository,
    authorRepository,
    embeddingService,
    logger: noopLogger,
  });

  // Create server
  const server = await createServer({
    createBookUseCase,
    logger: noopLogger,
  });

  return server;
}

/**
 * Starts the Fastify server on the E2E test port
 */
export async function startTestServer(server: FastifyInstance): Promise<void> {
  await server.listen({ port: E2E_SERVER_PORT, host: E2E_SERVER_HOST });
}

/**
 * Stops the Fastify server
 */
export async function stopTestServer(server: FastifyInstance): Promise<void> {
  await server.close();
}

/**
 * Result from executing a CLI command
 */
export interface CliResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

/**
 * Executes the CLI as a child process
 *
 * @param args - CLI arguments (without 'library' prefix)
 * @param options - Execution options
 * @returns Promise with exit code, stdout, and stderr
 */
export async function executeCli(
  args: string[],
  options: { cwd?: string; env?: Record<string, string>; timeout?: number } = {}
): Promise<CliResult> {
  const { cwd = process.cwd(), env = {}, timeout = 60000 } = options;

  return new Promise((resolve, reject) => {
    const fullEnv = {
      ...process.env,
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
      PATH: process.env['PATH'] || '/usr/local/bin:/usr/bin:/bin',
      ...env,
    };

    // Use spawn with explicit PATH to find node
    // The node process runs tsx as an ESM loader
    const child: ChildProcess = spawn(
      'node',
      ['--import', 'tsx', 'src/cli.ts', ...args],
      {
        cwd,
        env: fullEnv,
        stdio: ['pipe', 'pipe', 'pipe'],
      }
    );

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    const timeoutId = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`CLI execution timed out after ${timeout}ms`));
    }, timeout);

    child.on('close', (code) => {
      clearTimeout(timeoutId);
      resolve({
        exitCode: code ?? 1,
        stdout,
        stderr,
      });
    });

    child.on('error', (error) => {
      clearTimeout(timeoutId);
      reject(error);
    });
  });
}

/**
 * Creates a test context with server and database management
 */
export function createE2EContext() {
  let db: TestDb;
  let server: FastifyInstance;

  return {
    async setup() {
      db = await createTestDb();
      await clearTestData(db);
      server = await createTestServer(db);
      await startTestServer(server);
      return { db, server };
    },

    async teardown() {
      if (server) {
        await stopTestServer(server);
      }
      if (db) {
        await clearTestData(db);
        await closeTestDb(db);
      }
    },

    async cleanup() {
      if (db) {
        await clearTestData(db);
      }
    },

    getDb() {
      return db;
    },

    getServer() {
      return server;
    },
  };
}

/**
 * Generates a unique ISBN for testing (prevents duplicates)
 */
export function generateUniqueISBN(): string {
  // Generate a unique 13-digit ISBN starting with 978
  const timestamp = Date.now().toString().slice(-9);
  const isbn12 = `978${timestamp}`;
  // Calculate check digit
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(isbn12[i], 10);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return `${isbn12}${checkDigit}`;
}

/**
 * Test fixtures for E2E tests
 */
export const e2eFixtures = {
  validBook: {
    title: 'E2E Test Book',
    authors: ['E2E Author'],
    description: 'A book created during E2E testing to verify system functionality.',
    type: 'technical' as const,
    format: 'pdf' as const,
    categories: ['E2E Testing'],
    isbn: null as string | null,
    available: true,
    path: '/test/e2e-book.pdf',
  },

  bookWithoutTitle: {
    authors: ['E2E Author'],
    description: 'A book without title.',
    type: 'technical' as const,
    format: 'pdf' as const,
    categories: ['E2E Testing'],
  },

  bookWithInvalidType: {
    title: 'Invalid Type Book',
    authors: ['E2E Author'],
    description: 'A book with invalid type.',
    type: 'invalid_type',
    format: 'pdf',
    categories: ['E2E Testing'],
  },
};
