/**
 * Script: consolidate-books.ts
 *
 * Consolidates multiple JSON files containing book data from original_data/
 * into a single deduplicated JSON file at docs/db/books.json.
 *
 * Features:
 * - Reads all *.json files from original_data/ directory (monorepo root)
 * - Connects to database to exclude books that already exist (by ISBN)
 * - Detects duplicates by ISBN (id field in source)
 * - Keeps first occurrence of each ISBN (alphabetical file order)
 * - Preserves ALL original properties from source books
 * - HU-013: Preserves type/format from source if present, uses defaults otherwise
 * - Deletes existing books.json before generating new one
 * - Idempotent: can be run multiple times safely
 *
 * Requirements:
 * - Database must be running (uses DATABASE_URL env var)
 *
 * Usage:
 *   npx tsx scripts/consolidate-books.ts
 *   npm run consolidate:books
 */

import { readdir, readFile, writeFile, mkdir, unlink, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../src/infrastructure/driven/persistence/drizzle/schema.js';
import { loadEnvConfig } from '../src/infrastructure/config/env.js';

/**
 * Drizzle database type for type safety
 */
type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

// Get directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// APP_ROOT points to apps/api-cli or /app in Docker
const APP_ROOT = join(__dirname, '..');

// In Docker: /app maps to apps/api-cli, and original_data is mounted at /app/original_data
// In local: original_data is at monorepo root, so we go up from apps/api-cli
// We use environment variable MONOREPO_ROOT to handle this, defaulting to local structure
const MONOREPO_ROOT = process.env['MONOREPO_ROOT'] ?? join(APP_ROOT, '..', '..');
const SOURCE_DIR = join(MONOREPO_ROOT, 'original_data');

// Output goes to docs/db at monorepo root
const OUTPUT_DIR = join(MONOREPO_ROOT, 'docs', 'db');
const OUTPUT_FILE = join(OUTPUT_DIR, 'books.json');

/**
 * Source book structure (from JSON files)
 * Uses index signature to allow any additional properties
 * HU-013: type and format can now come from source JSON files
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
  readonly type?: string;   // HU-013: Can come from source JSON
  readonly format?: string; // HU-013: Can come from source JSON
  readonly [key: string]: unknown;
}

/**
 * Consolidated book structure (preserves all original properties + type/format)
 * The output maintains ALL original properties and adds type/format
 */
interface ConsolidatedBook extends SourceBook {
  readonly type: string;
  readonly format: string;
}

/**
 * Consolidation result statistics
 */
interface ConsolidationResult {
  readonly totalFiles: number;
  readonly totalBooksRead: number;
  readonly uniqueBooks: number;
  readonly duplicatesSkipped: number;
  readonly existingInDbSkipped: number;
  readonly outputPath: string;
}

/**
 * Enhances a source book with type and format properties.
 * HU-013: Preserves type/format from source if present, otherwise uses defaults.
 * - If source.type exists and has value → use source.type
 * - If source.type is undefined → use 'technical'
 * - If source.format exists and has value → use source.format
 * - If source.format is undefined → use 'epub'
 */
function transformBook(source: SourceBook): ConsolidatedBook {
  return Object.freeze({
    ...source,
    type: source.type ?? 'technical',
    format: source.format ?? 'epub',
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
 * Retrieves all existing ISBNs from the database
 * Used to exclude books that are already in the database from consolidation
 *
 * @param db - Drizzle database instance
 * @returns Set of existing ISBN strings (null values filtered out)
 */
async function getExistingIsbns(db: DrizzleDb): Promise<Set<string>> {
  const results = await db.select({ isbn: schema.books.isbn }).from(schema.books);
  const isbns = new Set<string>();

  for (const row of results) {
    if (row.isbn !== null) {
      isbns.add(row.isbn);
    }
  }

  return isbns;
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
 * Main consolidation function
 */
async function consolidateBooks(): Promise<ConsolidationResult> {
  console.log('Starting book consolidation...');
  console.log(`Source directory: ${SOURCE_DIR}`);
  console.log(`Output file: ${OUTPUT_FILE}`);

  // Load environment configuration and connect to database
  const env = loadEnvConfig();
  const pool = new Pool({ connectionString: env.database.url });
  const db = drizzle(pool, { schema });

  try {
    // Get existing ISBNs from database
    console.log('Connecting to database to check existing books...');
    const existingIsbns = await getExistingIsbns(db);
    console.log(`Found ${existingIsbns.size} existing books in database`);

    // Get all JSON files sorted alphabetically
    const files = await readdir(SOURCE_DIR);
    const jsonFiles = files.filter((f) => f.endsWith('.json')).sort();

    if (jsonFiles.length === 0) {
      throw new Error(`No JSON files found in ${SOURCE_DIR}`);
    }

    console.log(`Found ${jsonFiles.length} JSON files`);

    // Track seen ISBNs to detect duplicates
    const seenIsbns = new Set<string>();
    const consolidatedBooks: ConsolidatedBook[] = [];
    let totalBooksRead = 0;
    let duplicatesSkipped = 0;
    let existingInDbSkipped = 0;

    // Process each file in alphabetical order
    for (const file of jsonFiles) {
      const filePath = join(SOURCE_DIR, file);
      console.log(`Processing: ${file}`);

      const books = await readJsonFile(filePath);
      totalBooksRead += books.length;

      for (const book of books) {
        // Skip if already exists in database
        if (existingIsbns.has(book.id)) {
          existingInDbSkipped++;
          continue;
        }

        // Skip if duplicate within source files
        if (seenIsbns.has(book.id)) {
          duplicatesSkipped++;
          continue;
        }

        seenIsbns.add(book.id);
        consolidatedBooks.push(transformBook(book));
      }
    }

    // Ensure output directory exists
    await mkdir(OUTPUT_DIR, { recursive: true });

    // Delete existing output file if it exists (ensures idempotent generation)
    try {
      await access(OUTPUT_FILE);
      await unlink(OUTPUT_FILE);
      console.log(`Deleted existing output file: ${OUTPUT_FILE}`);
    } catch {
      // File doesn't exist, nothing to delete
    }

    // Write consolidated output
    await writeFile(OUTPUT_FILE, JSON.stringify(consolidatedBooks, null, 2), 'utf-8');

    const result: ConsolidationResult = Object.freeze({
      totalFiles: jsonFiles.length,
      totalBooksRead,
      uniqueBooks: consolidatedBooks.length,
      duplicatesSkipped,
      existingInDbSkipped,
      outputPath: OUTPUT_FILE,
    });

    console.log('\n--- Consolidation Complete ---');
    console.log(`Files processed: ${result.totalFiles}`);
    console.log(`Total books read: ${result.totalBooksRead}`);
    console.log(`Unique books: ${result.uniqueBooks}`);
    console.log(`Duplicates skipped: ${result.duplicatesSkipped}`);
    console.log(`Already in database: ${result.existingInDbSkipped}`);
    console.log(`Output written to: ${result.outputPath}`);

    return result;
  } finally {
    // Always close the database connection
    await pool.end();
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

export { consolidateBooks, transformBook, isValidSourceBook, getExistingIsbns };
export type { SourceBook, ConsolidatedBook, ConsolidationResult, DrizzleDb };
