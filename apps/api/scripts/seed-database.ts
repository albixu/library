/**
 * Script: seed-database.ts
 *
 * Loads book data from initial_data/*.json into the database using CreateBookUseCase.
 * This script is idempotent - running it multiple times will only add new books.
 *
 * Features:
 * - Reads partitioned book files from initial_data/ (books_0001.json, etc.)
 * - Uses pre-translated descriptions (translatedDescription field)
 * - Checks for existing books by ISBN before creating
 * - Creates authors and categories via the use case
 * - Handles embedding service failures with retries
 * - Processes books in batches for large datasets
 * - Shows progress and summary statistics
 *
 * IMPORTANT: This script expects books to already have translatedDescription.
 * Run consolidate-books.ts first to generate the initial_data files with translations.
 *
 * Usage:
 *   Development: npx tsx scripts/seed-database.ts
 *   Production:  node dist/scripts/seed-database.js
 *   npm scripts: npm run seed:database (dev) | npm run seed:prod (prod)
 *
 * Environment variables:
 *   DATABASE_URL - PostgreSQL connection string (required)
 *   OLLAMA_BASE_URL - Ollama service URL (default: http://ollama:11434)
 *   BATCH_SIZE - Number of books per batch (default: 50)
 *   MAX_RETRIES - Max retries for embedding failures (default: 3)
 */

import { readdir, readFile } from 'node:fs/promises';
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
import { PostgresLevelRepository } from '../src/infrastructure/driven/persistence/PostgresLevelRepository.js';
import { CreateBookUseCase, type CreateBookInput } from '../src/application/use-cases/CreateBookUseCase.js';
import type { Logger } from '../src/application/ports/Logger.js';

// Get directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path resolution for both development and production:
// - Development (tsx): scripts/ is at apps/api/scripts/, initial_data at monorepo/initial_data/
// - Production (node): dist/scripts/ is at /app/dist/scripts/, initial_data at /app/data/initial_data/
// Use INITIAL_DATA_DIR env var to override, or detect based on __dirname
const getDefaultInitialDataDir = (): string => {
  // Check if running from compiled dist folder
  if (__dirname.includes('dist')) {
    // Production: /app/dist/scripts → /app/data/initial_data
    return join(__dirname, '..', '..', 'data', 'initial_data');
  }
  // Development: apps/api/scripts → monorepo/initial_data
  return join(__dirname, '..', '..', '..', 'initial_data');
};

const INITIAL_DATA_DIR = process.env['INITIAL_DATA_DIR'] ?? getDefaultInitialDataDir();

// Configuration
const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/**
 * Source book structure from initial_data JSON files
 * This reflects the output format from consolidate-books.ts
 */
interface SourceBook {
  readonly id: string;           // ISBN (stored as 'id' in source)
  readonly title: string;
  readonly authors: readonly string[];
  readonly description: string;
  readonly translatedDescription: string; // Pre-translated Spanish description
  readonly language: string;     // ISO 639-1 code (e.g., 'en', 'es')
  readonly type: string;
  readonly tags?: readonly string[]; // Categories (stored as 'tags' in source)
  readonly format: string;
  readonly level?: string;
  // Additional fields that may be present but not used
  readonly pages?: string;
  readonly publication_date?: string;
}

/**
 * Internal book structure after transformation
 * This is what the rest of the script works with
 */
interface ConsolidatedBook {
  readonly isbn: string;
  readonly title: string;
  readonly authors: readonly string[];
  readonly description: string;
  readonly translatedDescription: string;
  readonly language: string;
  readonly type: string;
  readonly categories: readonly string[];
  readonly format: string;
  readonly available: boolean;
  readonly level?: string;
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
 * Validates that an object is a valid SourceBook from initial_data files
 */
function isValidSourceBook(obj: unknown): obj is SourceBook {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const book = obj as Record<string, unknown>;

  // level is optional - if present, must be string or null/undefined
  const levelValid =
    book.level === undefined ||
    book.level === null ||
    typeof book.level === 'string';

  // tags is optional - if present, must be array of strings
  const tagsValid =
    book.tags === undefined ||
    (Array.isArray(book.tags) && book.tags.every((t) => typeof t === 'string'));

  return (
    typeof book.id === 'string' &&
    typeof book.title === 'string' &&
    Array.isArray(book.authors) &&
    book.authors.length > 0 &&
    book.authors.every((a) => typeof a === 'string') &&
    typeof book.description === 'string' &&
    typeof book.translatedDescription === 'string' && // Required: pre-translated description
    typeof book.language === 'string' &&
    typeof book.type === 'string' &&
    typeof book.format === 'string' &&
    tagsValid &&
    levelValid
  );
}

/**
 * Deduplicates an array of author names by trimmed, case-insensitive name.
 * Keeps the first occurrence of each name.
 * Acts as a defensive guard before passing data to the domain layer.
 */
function deduplicateAuthors(authors: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  return authors.filter(name => {
    const key = name.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Transforms a SourceBook to ConsolidatedBook (internal format)
 * Maps: id→isbn, tags→categories, adds available=true default
 * Deduplicates authors to handle dirty source data
 */
function transformSourceBook(source: SourceBook): ConsolidatedBook {
  return {
    isbn: source.id,
    title: source.title,
    authors: deduplicateAuthors(source.authors),
    description: source.description,
    translatedDescription: source.translatedDescription,
    language: source.language,
    type: source.type,
    categories: source.tags ?? [],
    format: source.format,
    available: true, // Default: all imported books are available
    level: source.level,
  };
}

/**
 * Reads and parses all JSON files from the initial_data directory
 * Returns books from all files combined
 */
async function readInitialDataFiles(dirPath: string): Promise<ConsolidatedBook[]> {
  const files = await readdir(dirPath);
  const jsonFiles = files.filter((f) => f.endsWith('.json')).sort();

  if (jsonFiles.length === 0) {
    throw new Error(`No JSON files found in ${dirPath}. Run consolidate-books.ts first.`);
  }

  console.log(`Found ${jsonFiles.length} data files`);

  const allBooks: ConsolidatedBook[] = [];
  let invalidCount = 0;

  for (const file of jsonFiles) {
    const filePath = join(dirPath, file);
    console.log(`Reading: ${file}`);

    const content = await readFile(filePath, 'utf-8');
    const parsed: unknown = JSON.parse(content);

    if (!Array.isArray(parsed)) {
      console.warn(`Warning: ${file} does not contain an array, skipping`);
      continue;
    }

    for (const item of parsed) {
      if (isValidSourceBook(item)) {
        allBooks.push(transformSourceBook(item));
      } else {
        invalidCount++;
        if (invalidCount <= 3) {
          console.warn(
            'Warning: Invalid book entry in file, skipping:',
            typeof item === 'object' && item !== null
              ? (item as Record<string, unknown>).id ?? 'unknown'
              : 'invalid',
          );
        }
      }
    }
  }

  if (invalidCount > 3) {
    console.warn(`... and ${invalidCount - 3} more invalid entries skipped`);
  }

  return allBooks;
}

/**
 * Converts a ConsolidatedBook to CreateBookInput
 * Uses the pre-translated description for embedding generation
 */
function toCreateBookInput(book: ConsolidatedBook): CreateBookInput {
  return {
    title: book.title,
    authors: [...book.authors],
    description: book.description,
    translatedDescription: book.translatedDescription, // Pass pre-translated description
    language: book.language,
    type: book.type,
    categoryNames: [...book.categories],
    format: book.format,
    isbn: book.isbn,
    available: book.available,
    path: null,
    level: book.level ?? null,
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
  maxRetries: number,
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
      const isEmbeddingError =
        lastError.message.includes('embedding') ||
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
  maxRetries: number,
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
  console.log(`Initial data directory: ${INITIAL_DATA_DIR}`);

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
      timeoutMs: env.ollama.timeoutMs,
    });

    const bookRepository = new PostgresBookRepository(db as any);
    const categoryRepository = new PostgresCategoryRepository(db as any);
    const typeRepository = new PostgresTypeRepository(db as any);
    const authorRepository = new PostgresAuthorRepository(db as any);
    const levelRepository = new PostgresLevelRepository(db as any);

    // Initialize use case WITHOUT translation service
    // Books already have pre-translated descriptions from consolidate-books.ts
    const createBookUseCase = new CreateBookUseCase({
      bookRepository,
      categoryRepository,
      typeRepository,
      authorRepository,
      levelRepository,
      embeddingService,
      logger,
    });

    // Read all books from initial_data files
    const books = await readInitialDataFiles(INITIAL_DATA_DIR);
    seedLogger.info(`Loaded ${books.length} books from initial data files`);

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
          maxRetries,
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

/**
 * Determines if this module is being run directly (not imported)
 * Uses argv[1] comparison since import.meta.url check is unreliable with tsx
 */
function isMainModule(): boolean {
  // When run with tsx: process.argv[1] contains the script path
  // When imported: process.argv[1] contains vitest/node path
  const scriptPath = process.argv[1] ?? '';
  return scriptPath.includes('seed-database');
}

// Run only if executed directly (not when imported for testing)
if (isMainModule()) {
  seedDatabase().catch((error: unknown) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  });
}

export { seedDatabase, readInitialDataFiles, toCreateBookInput, isValidSourceBook, transformSourceBook };
export type { SourceBook, ConsolidatedBook, SeedingSummary, BookResult };
