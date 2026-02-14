/**
 * Script: seed-database.ts
 *
 * Loads book data from docs/db/books.json into the database using CreateBookUseCase.
 * This script is idempotent - running it multiple times will only add new books.
 *
 * Features:
 * - Reads consolidated books from docs/db/books.json
 * - Checks for existing books by ISBN before creating
 * - Creates authors and categories via the use case
 * - Handles embedding service failures with retries
 * - Processes books in batches for large datasets
 * - Shows progress and summary statistics
 *
 * Usage:
 *   npx tsx scripts/seed-database.ts
 *   npm run seed:database
 *
 * Environment variables:
 *   DATABASE_URL - PostgreSQL connection string (required)
 *   OLLAMA_BASE_URL - Ollama service URL (default: http://ollama:11434)
 *   BATCH_SIZE - Number of books per batch (default: 50)
 *   MAX_RETRIES - Max retries for embedding failures (default: 3)
 */

import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../src/infrastructure/driven/persistence/drizzle/schema.js';
import { loadEnvConfig } from '../src/infrastructure/config/env.js';
import { PinoLogger } from '../src/infrastructure/driven/logging/PinoLogger.js';
import { OllamaEmbeddingService } from '../src/infrastructure/driven/embedding/OllamaEmbeddingService.js';
import { PostgresBookRepository } from '../src/infrastructure/driven/persistence/PostgresBookRepository.js';
import { PostgresCategoryRepository } from '../src/infrastructure/driven/persistence/PostgresCategoryRepository.js';
import { PostgresTypeRepository } from '../src/infrastructure/driven/persistence/PostgresTypeRepository.js';
import { PostgresAuthorRepository } from '../src/infrastructure/driven/persistence/PostgresAuthorRepository.js';
import { CreateBookUseCase, type CreateBookInput } from '../src/application/use-cases/CreateBookUseCase.js';
import type { Logger } from '../src/application/ports/Logger.js';

// Get directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// In Docker: scripts is at /app/scripts, so /app/docs/db/books.json
const APP_ROOT = join(__dirname, '..');
const BOOKS_FILE = join(APP_ROOT, 'docs', 'db', 'books.json');

// Configuration
const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/**
 * Book structure from consolidated JSON
 */
interface ConsolidatedBook {
  readonly isbn: string;
  readonly title: string;
  readonly authors: readonly string[];
  readonly description: string;
  readonly type: string;
  readonly categories: readonly string[];
  readonly format: string;
  readonly available: boolean;
}

/**
 * Result of processing a single book
 */
type BookResult = 'created' | 'skipped' | 'error';

/**
 * Summary statistics for the seeding operation
 */
interface SeedingSummary {
  readonly totalProcessed: number;
  readonly created: number;
  readonly skipped: number;
  readonly errors: number;
  readonly failedIsbns: string[];
  readonly durationMs: number;
}

/**
 * Validates that an object is a valid ConsolidatedBook
 */
function isValidConsolidatedBook(obj: unknown): obj is ConsolidatedBook {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const book = obj as Record<string, unknown>;

  return (
    typeof book.isbn === 'string' &&
    typeof book.title === 'string' &&
    Array.isArray(book.authors) &&
    book.authors.length > 0 &&
    book.authors.every((a) => typeof a === 'string') &&
    typeof book.description === 'string' &&
    typeof book.type === 'string' &&
    Array.isArray(book.categories) &&
    book.categories.every((c) => typeof c === 'string') &&
    typeof book.format === 'string' &&
    typeof book.available === 'boolean'
  );
}

/**
 * Reads and parses the consolidated books JSON file
 */
async function readBooksFile(filePath: string): Promise<ConsolidatedBook[]> {
  const content = await readFile(filePath, 'utf-8');
  const parsed: unknown = JSON.parse(content);

  if (!Array.isArray(parsed)) {
    throw new Error(`Books file does not contain an array: ${filePath}`);
  }

  const validBooks: ConsolidatedBook[] = [];
  for (const item of parsed) {
    if (isValidConsolidatedBook(item)) {
      validBooks.push(item);
    } else {
      console.warn('Warning: Invalid book entry in consolidated file, skipping');
    }
  }

  return validBooks;
}

/**
 * Converts a ConsolidatedBook to CreateBookInput
 * Note: CreateBookUseCase expects 'author' (singular) but we have 'authors' (plural)
 * For now, we'll use the first author. The use case will create the author entity.
 */
function toCreateBookInput(book: ConsolidatedBook): CreateBookInput {
  return {
    title: book.title,
    author: book.authors[0] ?? 'Unknown Author', // Use first author for now
    description: book.description,
    type: book.type,
    categoryNames: [...book.categories],
    format: book.format,
    isbn: book.isbn,
    available: book.available,
    path: null,
  };
}

/**
 * Sleeps for the specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Seeds a single book with retry logic for embedding failures
 */
async function seedBook(
  book: ConsolidatedBook,
  createBookUseCase: CreateBookUseCase,
  bookRepository: { existsByIsbn(isbn: string): Promise<boolean> },
  logger: Logger,
  maxRetries: number
): Promise<BookResult> {
  // Check if book already exists by ISBN
  const exists = await bookRepository.existsByIsbn(book.isbn);
  if (exists) {
    logger.debug('Book already exists, skipping', { isbn: book.isbn, title: book.title });
    return 'skipped';
  }

  const input = toCreateBookInput(book);
  let lastError: Error | null = null;

  // Retry loop for embedding failures
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await createBookUseCase.execute(input);
      logger.debug('Book created successfully', { isbn: book.isbn, title: book.title });
      return 'created';
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check if it's an embedding service error (worth retrying)
      const isEmbeddingError = lastError.message.includes('embedding') || 
                              lastError.message.includes('Ollama') ||
                              lastError.message.includes('503') ||
                              lastError.message.includes('service unavailable');

      if (isEmbeddingError && attempt < maxRetries) {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1); // Exponential backoff
        logger.warn(`Embedding service error, retrying in ${delay}ms`, {
          isbn: book.isbn,
          attempt,
          maxRetries,
          error: lastError.message,
        });
        await sleep(delay);
        continue;
      }

      // Non-retryable error or max retries reached
      logger.error('Failed to create book', {
        isbn: book.isbn,
        title: book.title,
        error: lastError.message,
        attempt,
      });
      return 'error';
    }
  }

  // Should not reach here, but handle just in case
  logger.error('Exhausted all retries', { isbn: book.isbn, error: lastError?.message });
  return 'error';
}

/**
 * Processes books in batches
 */
async function processBatch(
  books: ConsolidatedBook[],
  batchNumber: number,
  totalBatches: number,
  createBookUseCase: CreateBookUseCase,
  bookRepository: { existsByIsbn(isbn: string): Promise<boolean> },
  logger: Logger,
  maxRetries: number
): Promise<{ created: number; skipped: number; errors: number; failedIsbns: string[] }> {
  logger.info(`Processing batch ${batchNumber}/${totalBatches}...`, {
    booksInBatch: books.length,
  });

  let created = 0;
  let skipped = 0;
  let errors = 0;
  const failedIsbns: string[] = [];

  for (const book of books) {
    const result = await seedBook(book, createBookUseCase, bookRepository, logger, maxRetries);
    
    switch (result) {
      case 'created':
        created++;
        break;
      case 'skipped':
        skipped++;
        break;
      case 'error':
        errors++;
        failedIsbns.push(book.isbn);
        break;
    }
  }

  return { created, skipped, errors, failedIsbns };
}

/**
 * Main seeding function
 */
async function seedDatabase(): Promise<SeedingSummary> {
  const startTime = Date.now();
  
  console.log('Starting database seeding...');
  console.log(`Books file: ${BOOKS_FILE}`);

  // Load configuration
  const env = loadEnvConfig();
  const batchSize = parseInt(process.env['BATCH_SIZE'] ?? '', 10) || DEFAULT_BATCH_SIZE;
  const maxRetries = parseInt(process.env['MAX_RETRIES'] ?? '', 10) || DEFAULT_MAX_RETRIES;

  // Initialize logger
  const logger = new PinoLogger({ level: 'info', prettyPrint: true });
  const seedLogger = logger.child({ name: 'SeedDatabase' });

  seedLogger.info('Configuration loaded', {
    batchSize,
    maxRetries,
    ollamaUrl: env.ollama.baseUrl,
  });

  // Initialize database connection
  const pool = new Pool({ connectionString: env.database.url });
  const db = drizzle(pool, { schema });

  seedLogger.info('Database connection established');

  try {
    // Initialize adapters
    const embeddingService = new OllamaEmbeddingService({
      baseUrl: env.ollama.baseUrl,
      model: env.ollama.model,
    });

    const bookRepository = new PostgresBookRepository(db as any);
    const categoryRepository = new PostgresCategoryRepository(db as any);
    const typeRepository = new PostgresTypeRepository(db as any);
    const authorRepository = new PostgresAuthorRepository(db as any);

    // Initialize use case
    const createBookUseCase = new CreateBookUseCase({
      bookRepository,
      categoryRepository,
      typeRepository,
      authorRepository,
      embeddingService,
      logger,
    });

    // Read books file
    const books = await readBooksFile(BOOKS_FILE);
    seedLogger.info(`Loaded ${books.length} books from file`);

    if (books.length === 0) {
      seedLogger.warn('No books to process');
      return {
        totalProcessed: 0,
        created: 0,
        skipped: 0,
        errors: 0,
        failedIsbns: [],
        durationMs: Date.now() - startTime,
      };
    }

    // Split into batches
    const batches: ConsolidatedBook[][] = [];
    for (let i = 0; i < books.length; i += batchSize) {
      batches.push(books.slice(i, i + batchSize));
    }

    seedLogger.info(`Processing ${batches.length} batches of up to ${batchSize} books each`);

    // Process batches
    let totalCreated = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    const allFailedIsbns: string[] = [];

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      if (batch) {
        const result = await processBatch(
          batch,
          i + 1,
          batches.length,
          createBookUseCase,
          bookRepository,
          seedLogger,
          maxRetries
        );

        totalCreated += result.created;
        totalSkipped += result.skipped;
        totalErrors += result.errors;
        allFailedIsbns.push(...result.failedIsbns);
      }
    }

    const durationMs = Date.now() - startTime;

    const summary: SeedingSummary = {
      totalProcessed: books.length,
      created: totalCreated,
      skipped: totalSkipped,
      errors: totalErrors,
      failedIsbns: allFailedIsbns,
      durationMs,
    };

    // Log summary
    console.log('\n--- Seeding Complete ---');
    console.log(`Total processed: ${summary.totalProcessed}`);
    console.log(`Created: ${summary.created}`);
    console.log(`Skipped (already exist): ${summary.skipped}`);
    console.log(`Errors: ${summary.errors}`);
    console.log(`Duration: ${(summary.durationMs / 1000).toFixed(2)}s`);

    if (summary.failedIsbns.length > 0) {
      console.log('\nFailed ISBNs:');
      for (const isbn of summary.failedIsbns.slice(0, 10)) {
        console.log(`  - ${isbn}`);
      }
      if (summary.failedIsbns.length > 10) {
        console.log(`  ... and ${summary.failedIsbns.length - 10} more`);
      }
    }

    return summary;
  } finally {
    await pool.end();
    seedLogger.info('Database connection closed');
  }
}

// Run if executed directly
seedDatabase().catch((error: unknown) => {
  console.error('Seeding failed:', error);
  process.exit(1);
});

export { seedDatabase, readBooksFile, toCreateBookInput, isValidConsolidatedBook };
export type { ConsolidatedBook, SeedingSummary, BookResult };
