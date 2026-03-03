/**
 * Script: consolidate-books.ts
 *
 * Consolidates multiple JSON files containing book data from original_data/
 * into multiple partitioned JSON files at docs/db/initial_data/.
 *
 * Features:
 * - Reads all *.json files from original_data/ directory (monorepo root)
 * - Connects to database to exclude books that already exist (by ISBN)
 * - Detects duplicates by ISBN (id field in source)
 * - Keeps first occurrence of each ISBN (alphabetical file order)
 * - Preserves ALL original properties from source books
 * - Translates non-Spanish descriptions to Spanish using Ollama
 * - Persistent translation cache (SHA-256 indexed JSON) to skip already-translated texts
 * - Parallel batch processing (configurable concurrency) to speed up translation
 * - Generates multiple output files with configurable batch size (default: 1000)
 * - Deletes existing output directory before generating new files
 * - Idempotent: can be run multiple times safely
 * - Shows progress with ETA and cache statistics per batch
 *
 * Requirements:
 * - Database must be running (uses DATABASE_URL env var)
 * - Translation service must be running (Ollama or LibreTranslate, see TRANSLATION_PROVIDER)
 *
 * Usage:
 *   npx tsx scripts/consolidate-books.ts
 *   npm run consolidate:books
 *
 * Environment variables:
 *   TRANSLATION_PROVIDER     - Translation provider: 'ollama' (default) or 'libretranslate'
 *   OLLAMA_TRANSLATION_URL   - Ollama service URL (default: http://ollama-translations:11435)
 *   TRANSLATION_MODEL        - Model for translation (default: llama3.2:1b, Ollama only)
 *   LIBRETRANSLATE_URL       - LibreTranslate service URL (default: http://libretranslate:5000)
 *   TRANSLATION_TIMEOUT_MS   - Timeout for translation (default: 180000)
 *   TRANSLATION_CONCURRENCY  - Parallel translations per batch (default: 3)
 *   TRANSLATION_CACHE_PATH   - Path to translation cache JSON (default: <APP_ROOT>/tmp/cache/translation-cache.json)
 *   BOOKS_PER_FILE           - Number of books per output file (default: 1000)
 */

import { readdir, readFile, writeFile, mkdir, rm, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';import { fileURLToPath } from 'node:url';
import { loadEnvConfig } from '../src/infrastructure/config/env.js';
import { OllamaTranslationService } from '../src/infrastructure/driven/translation/OllamaTranslationService.js';
import { LibreTranslateTranslationService } from '../src/infrastructure/driven/translation/LibreTranslateTranslationService.js';
import type { TranslationService } from '../src/application/ports/TranslationService.js';
import {
  openCache,
  getAsync as cacheGetAsync,
  setEntry as cacheSetEntry,
  saveDirty,
  getCacheKey,
  type PartitionedCache,
} from './translation-cache.js';

// Get directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// APP_ROOT points to apps/api or /app in Docker
const APP_ROOT = join(__dirname, '..');

// In Docker: /app maps to apps/api, and original_data is mounted at /app/original_data
// In local: original_data is at monorepo root, so we go up from apps/api
// We use environment variable MONOREPO_ROOT to handle this, defaulting to local structure
const MONOREPO_ROOT = process.env['MONOREPO_ROOT'] ?? join(APP_ROOT, '..', '..');
const SOURCE_DIR = join(MONOREPO_ROOT, 'original_data');

// Output goes to docs/db/initial_data at monorepo root
const OUTPUT_DIR = join(MONOREPO_ROOT, 'docs', 'db', 'initial_data');

// Configuration
const DEFAULT_BOOKS_PER_FILE = 1000;
const DEFAULT_TRANSLATION_TIMEOUT_MS = 180000;
const DEFAULT_TRANSLATION_CONCURRENCY = 3;
const RETRY_DELAY_MS = 2000;
const MAX_RETRIES = 3;

/**
 * Source book structure (from JSON files)
 * Uses index signature to allow any additional properties
 */
interface SourceBook {
  readonly id: string;
  readonly title: string;
  readonly authors: readonly string[];
  readonly description: string;
  readonly language?: string;
  readonly level?: string;
  readonly pages?: string;
  readonly publication_date?: string;
  readonly tags?: readonly string[];
  readonly type?: string;
  readonly format?: string;
  readonly [key: string]: unknown;
}

/**
 * Consolidated book structure with translation fields
 * The output includes the original description and translated description
 */
interface ConsolidatedBook extends SourceBook {
  readonly type: string;
  readonly format: string;
  readonly translatedDescription: string; // Spanish translation of description
}

/**
 * Consolidation result statistics
 */
interface ConsolidationResult {
  readonly totalFiles: number;
  readonly totalBooksRead: number;
  readonly uniqueBooks: number;
  readonly duplicatesSkipped: number;
  readonly translatedCount: number;
  readonly translationErrors: number;
  readonly cacheHits: number;
  readonly cacheMisses: number;
  readonly concurrency: number;
  readonly outputFilesGenerated: number;
  readonly outputDirectory: string;
  readonly durationMs: number;
}

/**
 * Enhances a source book with type, format, and translated description.
 * - If source.type exists and has value -> use source.type
 * - If source.type is undefined -> use 'technical'
 * - If source.format exists and has value -> use source.format
 * - If source.format is undefined -> use 'epub'
 * - translatedDescription is added by the translation process
 */
function transformBook(source: SourceBook, translatedDescription: string): ConsolidatedBook {
  return Object.freeze({
    ...source,
    type: source.type ?? 'technical',
    format: source.format ?? 'epub',
    translatedDescription,
  }) as ConsolidatedBook;
}

/**
 * Validates that a source object has required fields
 */
function isValidSourceBook(obj: unknown): obj is SourceBook {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const book = obj as Record<string, unknown>;

  return (
    typeof book.id === 'string' &&
    book.id.length > 0 &&
    typeof book.title === 'string' &&
    book.title.length > 0 &&
    Array.isArray(book.authors) &&
    book.authors.length > 0 &&
    book.authors.every((a) => typeof a === 'string') &&
    typeof book.description === 'string'
  );
}

/**
 * Reads and parses a single JSON file
 */
async function readJsonFile(filePath: string): Promise<SourceBook[]> {
  const content = await readFile(filePath, 'utf-8');
  const parsed: unknown = JSON.parse(content);

  if (!Array.isArray(parsed)) {
    console.warn(`Warning: ${filePath} does not contain an array, skipping`);
    return [];
  }

  const validBooks: SourceBook[] = [];
  for (const item of parsed) {
    if (isValidSourceBook(item)) {
      validBooks.push(item);
    } else {
      console.warn(`Warning: Invalid book entry in ${filePath}, skipping`);
    }
  }

  return validBooks;
}

/**
 * Translates a description to Spanish with retry logic
 */
async function translateDescription(
  description: string,
  language: string | undefined,
  translationService: TranslationService,
): Promise<{ translated: string; success: boolean }> {
  // If already Spanish or empty, no translation needed
  if (language?.toLowerCase() === 'es' || description.trim().length === 0) {
    return { translated: description, success: true };
  }

  // Attempt translation with retries
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await translationService.translate(description, 'es');
      return { translated: result.translatedText, success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        console.warn(`  Translation attempt ${attempt}/${MAX_RETRIES} failed, retrying in ${delay}ms...`);
        await sleep(delay);
      } else {
        console.error(`  Translation failed after ${MAX_RETRIES} attempts: ${errorMessage}`);
        // Return original description on failure
        return { translated: description, success: false };
      }
    }
  }

  return { translated: description, success: false };
}

/**
 * Sleep for a specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Formats duration in human-readable format
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

/**
 * Writes books to partitioned JSON files
 */
async function writePartitionedFiles(
  books: ConsolidatedBook[],
  outputDir: string,
  booksPerFile: number,
): Promise<number> {
  // Ensure output directory exists
  await mkdir(outputDir, { recursive: true });

  const totalFiles = Math.ceil(books.length / booksPerFile);

  for (let i = 0; i < totalFiles; i++) {
    const start = i * booksPerFile;
    const end = Math.min(start + booksPerFile, books.length);
    const batch = books.slice(start, end);

    // Format: books_0001.json, books_0002.json, etc.
    const fileName = `books_${String(i + 1).padStart(4, '0')}.json`;
    const filePath = join(outputDir, fileName);

    await writeFile(filePath, JSON.stringify(batch, null, 2), 'utf-8');
    console.log(`  Written ${batch.length} books to ${fileName}`);
  }

  return totalFiles;
}

/**
 * Main consolidation function
 */
async function consolidateBooks(): Promise<ConsolidationResult> {
  const startTime = Date.now();

  console.log('Starting book consolidation with translation...');
  console.log(`Source directory: ${SOURCE_DIR}`);
  console.log(`Output directory: ${OUTPUT_DIR}`);

  // Load configuration
  const env = loadEnvConfig();
  const booksPerFile = parseInt(process.env['BOOKS_PER_FILE'] ?? '', 10) || DEFAULT_BOOKS_PER_FILE;
  const translationTimeoutMs = parseInt(process.env['TRANSLATION_TIMEOUT_MS'] ?? '', 10) || DEFAULT_TRANSLATION_TIMEOUT_MS;
  const concurrency = parseInt(process.env['TRANSLATION_CONCURRENCY'] ?? '', 10) || DEFAULT_TRANSLATION_CONCURRENCY;
  const cachePath = process.env['TRANSLATION_CACHE_PATH'] ?? join(APP_ROOT, 'tmp', 'cache');

  console.log(`Books per file: ${booksPerFile}`);
  console.log(`Translation timeout: ${translationTimeoutMs}ms`);
  console.log(`Translation concurrency: ${concurrency}`);
  console.log(`Translation cache dir: ${cachePath}`);

  // Initialize translation service — Strategy pattern via TRANSLATION_PROVIDER (HU-026)
  let translationService: TranslationService;
  let translationServiceLabel: string;
  if (env.translation.provider === 'libretranslate') {
    translationService = new LibreTranslateTranslationService({
      baseUrl: env.translation.libreTranslateUrl,
      timeoutMs: translationTimeoutMs,
      retries: 1, // We handle retries ourselves for better logging
    });
    translationServiceLabel = `LibreTranslate at ${env.translation.libreTranslateUrl}`;
  } else {
    translationService = new OllamaTranslationService({
      baseUrl: env.translation.baseUrl,
      model: env.translation.model,
      timeoutMs: translationTimeoutMs,
      retries: 1, // We handle retries ourselves for better logging
    });
    translationServiceLabel = `Ollama at ${env.translation.baseUrl} (model: ${env.translation.model})`;
  }

  // Check if translation service is available
  const isTranslationAvailable = await translationService.isAvailable();
  if (!isTranslationAvailable) {
    throw new Error(
      `Translation service not available: ${translationServiceLabel}. ` +
      'Make sure the service is running and reachable.'
    );
  }
  console.log(`Translation service available: ${translationServiceLabel}`);

  try {
    // Get all JSON files sorted alphabetically
    const files = await readdir(SOURCE_DIR);
    const jsonFiles = files.filter((f) => f.endsWith('.json')).sort();

    if (jsonFiles.length === 0) {
      throw new Error(`No JSON files found in ${SOURCE_DIR}`);
    }

    console.log(`Found ${jsonFiles.length} JSON files`);

    // Track seen ISBNs to detect duplicates
    const seenIsbns = new Set<string>();
    const booksToProcess: SourceBook[] = [];
    let totalBooksRead = 0;
    let duplicatesSkipped = 0;

    // First pass: read and deduplicate all books
    console.log('\n--- Phase 1: Reading and deduplicating books ---');
    for (const file of jsonFiles) {
      const filePath = join(SOURCE_DIR, file);
      console.log(`Processing: ${file}`);

      const books = await readJsonFile(filePath);
      totalBooksRead += books.length;

      for (const book of books) {
        // Skip if duplicate within source files
        if (seenIsbns.has(book.id)) {
          duplicatesSkipped++;
          continue;
        }

        seenIsbns.add(book.id);
        booksToProcess.push(book);
      }
    }

    console.log(`\nBooks to process: ${booksToProcess.length}`);
    console.log(`Duplicates skipped: ${duplicatesSkipped}`);

    if (booksToProcess.length === 0) {
      console.log('No books to process');
      return {
        totalFiles: jsonFiles.length,
        totalBooksRead,
        uniqueBooks: 0,
        duplicatesSkipped,
        translatedCount: 0,
        translationErrors: 0,
        cacheHits: 0,
        cacheMisses: 0,
        concurrency,
        outputFilesGenerated: 0,
        outputDirectory: OUTPUT_DIR,
        durationMs: Date.now() - startTime,
      };
    }

    // Second pass: translate descriptions with cache + parallel batches
    console.log('\n--- Phase 2: Translating descriptions ---');
    const consolidatedBooks: ConsolidatedBook[] = new Array(booksToProcess.length) as ConsolidatedBook[];
    let translatedCount = 0;
    let translationErrors = 0;
    let cacheHits = 0;
    let cacheMisses = 0;
    const translationStartTime = Date.now();

    // Load translation cache — partitioned layout, lazy per bucket
    const cache: PartitionedCache = await openCache(cachePath);
    console.log(`Cache loaded: ${cache.totalEntries} existing entries`);

    // Split books into batches of `concurrency` size
    const totalBatches = Math.ceil(booksToProcess.length / concurrency);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const batchStart = batchIndex * concurrency;
      const batchEnd = Math.min(batchStart + concurrency, booksToProcess.length);
      const batchBooks = booksToProcess.slice(batchStart, batchEnd);

      // Launch all translations in this batch simultaneously
      const batchResults = await Promise.allSettled(
        batchBooks.map(async (book) => {
          const needsTranslation = book.language?.toLowerCase() !== 'es' && book.description.trim().length > 0;

          if (!needsTranslation) {
            return { book, translated: book.description, success: true, fromCache: false, needed: false };
          }

          const key = getCacheKey(book.description);
          const cached = await cacheGetAsync(cache, key);

          if (cached !== undefined) {
            return { book, translated: cached, success: true, fromCache: true, needed: true };
          }

          // Cache miss: call translation service
          const { translated, success } = await translateDescription(
            book.description,
            book.language,
            translationService,
          );

          if (success) {
            cacheSetEntry(cache, key, translated);
          }

          return { book, translated, success, fromCache: false, needed: true };
        }),
      );

      // Collect results and update statistics
      for (let localIndex = 0; localIndex < batchResults.length; localIndex++) {
        const globalIndex = batchStart + localIndex;
        const result = batchResults[localIndex]!;

        if (result.status === 'fulfilled') {
          const { book, translated, success, fromCache, needed } = result.value;
          consolidatedBooks[globalIndex] = transformBook(book, translated);
          if (needed) {
            if (fromCache) {
              cacheHits++;
            } else if (success) {
              cacheMisses++;
              translatedCount++;
            } else {
              cacheMisses++;
              translationErrors++;
            }
          }
        } else {
          // Promise itself rejected (unexpected error)
          const book = booksToProcess[globalIndex]!;
          consolidatedBooks[globalIndex] = transformBook(book, book.description);
          translationErrors++;
          console.error(`  Unexpected error for "${book.title}": ${result.reason}`);
        }
      }

      // Persist only dirty partitions after each batch.
      // Each partition file is ~100KB (vs ~87MB monolithic), so I/O is fast even on slow volumes.
      await saveDirty(cache);

      // Progress log
      const processedSoFar = batchEnd;
      const progress = ((processedSoFar / booksToProcess.length) * 100).toFixed(1);
      const elapsed = Date.now() - translationStartTime;
      const avgPerBook = elapsed / processedSoFar;
      const remaining = booksToProcess.length - processedSoFar;
      const eta = avgPerBook * remaining;

      console.log(
        `[${progress}%] Batch ${batchIndex + 1}/${totalBatches} | ` +
        `Cache hits: ${cacheHits} | Translated: ${translatedCount} | ` +
        `Errors: ${translationErrors} | ETA: ${formatDuration(eta)}`,
      );
    }

    // Free memory: booksToProcess is no longer needed after Phase 2.
    // consolidatedBooks (same size) is still in memory for writing, so releasing
    // booksToProcess here halves peak heap usage before the write phase.
    booksToProcess.length = 0;

    // Delete existing output directory and recreate
    console.log('\n--- Phase 3: Writing output files ---');
    try {
      await access(OUTPUT_DIR);
      await rm(OUTPUT_DIR, { recursive: true, force: true });
      console.log(`Deleted existing output directory: ${OUTPUT_DIR}`);
    } catch {
      // Directory doesn't exist, nothing to delete
    }

    // Write partitioned files
    const outputFilesGenerated = await writePartitionedFiles(
      consolidatedBooks,
      OUTPUT_DIR,
      booksPerFile,
    );

    const durationMs = Date.now() - startTime;

    const result: ConsolidationResult = Object.freeze({
      totalFiles: jsonFiles.length,
      totalBooksRead,
      uniqueBooks: consolidatedBooks.length,
      duplicatesSkipped,
      translatedCount,
      translationErrors,
      cacheHits,
      cacheMisses,
      concurrency,
      outputFilesGenerated,
      outputDirectory: OUTPUT_DIR,
      durationMs,
    });

    console.log('\n--- Consolidation Complete ---');
    console.log(`Files processed: ${result.totalFiles}`);
    console.log(`Total books read: ${result.totalBooksRead}`);
    console.log(`Unique books: ${result.uniqueBooks}`);
    console.log(`Duplicates skipped: ${result.duplicatesSkipped}`);
    console.log(`Translated: ${result.translatedCount}`);
    console.log(`Translation errors: ${result.translationErrors}`);
    console.log(`Cache hits: ${result.cacheHits}`);
    console.log(`Cache misses: ${result.cacheMisses}`);
    console.log(`Concurrency: ${result.concurrency}`);
    console.log(`Output files generated: ${result.outputFilesGenerated}`);
    console.log(`Output directory: ${result.outputDirectory}`);
    console.log(`Total duration: ${formatDuration(result.durationMs)}`);

    return result;
  } finally {
    // Nothing to close since DB dependency was removed
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
  return scriptPath.includes('consolidate-books');
}

// Run only if executed directly (not when imported for testing)
if (isMainModule()) {
  consolidateBooks().catch((error: unknown) => {
    console.error('Consolidation failed:', error);
    process.exit(1);
  });
}

export { consolidateBooks, transformBook, isValidSourceBook };
export type { SourceBook, ConsolidatedBook, ConsolidationResult };
