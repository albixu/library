/**
 * E2E Test Setup
 *
 * Provides utilities for end-to-end testing:
 * - Fastify server lifecycle management
 * - Database cleanup between tests
 * - Test fixtures
 *
 * Requirements:
 * - Docker containers must be running: docker-compose up -d
 * - Ollama must have the embedding model loaded
 */

import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import type { FastifyInstance } from 'fastify';
import * as schema from '../../src/infrastructure/driven/persistence/drizzle/schema.js';
import { createServer } from '../../src/infrastructure/driver/http/server.js';
import { CreateBookUseCase } from '../../src/application/use-cases/CreateBookUseCase.js';
import { SearchBooksUseCase } from '../../src/application/use-cases/SearchBooksUseCase.js';
import { ListBookTypesUseCase } from '../../src/application/use-cases/ListBookTypesUseCase.js';
import { ListCategoriesUseCase } from '../../src/application/use-cases/ListCategoriesUseCase.js';
import { ListBookLevelsUseCase } from '../../src/application/use-cases/ListBookLevelsUseCase.js';
import { OllamaEmbeddingService } from '../../src/infrastructure/driven/embedding/OllamaEmbeddingService.js';
import { OllamaTranslationService } from '../../src/infrastructure/driven/translation/OllamaTranslationService.js';
import { PostgresBookRepository } from '../../src/infrastructure/driven/persistence/PostgresBookRepository.js';
import { PostgresCategoryRepository } from '../../src/infrastructure/driven/persistence/PostgresCategoryRepository.js';
import { PostgresTypeRepository } from '../../src/infrastructure/driven/persistence/PostgresTypeRepository.js';
import { PostgresAuthorRepository } from '../../src/infrastructure/driven/persistence/PostgresAuthorRepository.js';
import { PostgresLevelRepository } from '../../src/infrastructure/driven/persistence/PostgresLevelRepository.js';
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
const DEFAULT_TRANSLATION_MODEL = process.env['TRANSLATION_MODEL'] ?? 'llama3.2:1b';

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
  const translationModel = process.env['TRANSLATION_MODEL'] ?? DEFAULT_TRANSLATION_MODEL;

  // Create adapters
  const embeddingService = new OllamaEmbeddingService({
    baseUrl: ollamaUrl,
    model: ollamaModel,
    timeoutMs: 30000,
  });

  // HU-013: Translation service for description translation
  const translationService = new OllamaTranslationService({
    baseUrl: ollamaUrl,
    model: translationModel,
    timeoutMs: 60000,
    retries: 3,
  });

   
  const bookRepository = new PostgresBookRepository(db as any);
   
  const categoryRepository = new PostgresCategoryRepository(db as any);
   
  const typeRepository = new PostgresTypeRepository(db as any);
   
  const authorRepository = new PostgresAuthorRepository(db as any);

  const levelRepository = new PostgresLevelRepository(db as any);

  // Create use cases
  // HU-008: CreateBookUseCase now requires levelRepository
  // HU-013: CreateBookUseCase now requires translationService
  const createBookUseCase = new CreateBookUseCase({
    bookRepository,
    categoryRepository,
    typeRepository,
    authorRepository,
    levelRepository,
    embeddingService,
    translationService,
    logger: noopLogger,
  });

  const listBookTypesUseCase = new ListBookTypesUseCase(typeRepository);

  const listCategoriesUseCase = new ListCategoriesUseCase(
    categoryRepository,
    typeRepository,
  );

  const listBookLevelsUseCase = new ListBookLevelsUseCase(
    levelRepository,
    typeRepository,
  );

  const searchBooksUseCase = new SearchBooksUseCase({
    bookRepository,
    embeddingService,
    logger: noopLogger,
  });

  // Create server
  const server = await createServer({
    createBookUseCase,
    searchBooksUseCase,
    listBookTypesUseCase,
    listCategoriesUseCase,
    listBookLevelsUseCase,
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
 *
 * HU-013: Default language changed to 'es' to avoid translation service dependency
 * in most tests. Tests that specifically need translation should override language.
 */
export const e2eFixtures = {
  validBook: {
    title: 'E2E Test Book',
    authors: ['E2E Author'],
    description: 'Un libro creado durante las pruebas E2E para verificar la funcionalidad del sistema.',
    type: 'technical' as const,
    format: 'pdf' as const,
    categories: ['E2E Testing'],
    isbn: null as string | null,
    available: true,
    path: '/test/e2e-book.pdf',
    language: 'es' as const, // HU-013: Spanish to avoid translation
  },

  bookWithoutTitle: {
    authors: ['E2E Author'],
    description: 'Un libro sin título.',
    type: 'technical' as const,
    format: 'pdf' as const,
    categories: ['E2E Testing'],
    language: 'es' as const, // HU-013: Spanish to avoid translation
  },

  bookWithInvalidType: {
    title: 'Invalid Type Book',
    authors: ['E2E Author'],
    description: 'Un libro con tipo inválido.',
    type: 'invalid_type',
    format: 'pdf',
    categories: ['E2E Testing'],
    language: 'es', // HU-013: Spanish to avoid translation
  },
};
