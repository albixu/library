/**
 * Script: consolidate-books.ts
 *
 * Consolidates multiple JSON files containing book data from apps/api-cli/data/source/
 * into a single deduplicated JSON file at docs/db/books.json.
 *
 * Features:
 * - Reads all *.json files from source directory
 * - Detects duplicates by ISBN (id field in source)
 * - Keeps first occurrence of each ISBN (alphabetical file order)
 * - Transforms structure to match domain model
 *
 * Usage:
 *   npx tsx scripts/consolidate-books.ts
 *   npm run consolidate:books
 */

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Get directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// In Docker: scripts is at /app/scripts, so __dirname/../ = /app
// In local: scripts is at apps/api-cli/scripts, so __dirname/../ = apps/api-cli
const APP_ROOT = join(__dirname, '..');
const SOURCE_DIR = join(APP_ROOT, 'data', 'source');

// Output goes to docs/db relative to app root in Docker (/app/docs/db)
// or relative to api-cli in local (which needs adjustment for monorepo)
const OUTPUT_DIR = join(APP_ROOT, 'docs', 'db');
const OUTPUT_FILE = join(OUTPUT_DIR, 'books.json');

/**
 * Source book structure (from JSON files)
 */
interface SourceBook {
  readonly id: string;
  readonly language?: string;
  readonly level?: string;
  readonly title: string;
  readonly authors: readonly string[];
  readonly pages?: string;
  readonly publication_date?: string;
  readonly description: string;
  readonly tags?: readonly string[];
}

/**
 * Target book structure (for database seeding)
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
 * Consolidation result statistics
 */
interface ConsolidationResult {
  readonly totalFiles: number;
  readonly totalBooksRead: number;
  readonly uniqueBooks: number;
  readonly duplicatesSkipped: number;
  readonly outputPath: string;
}

/**
 * Transforms a source book to the consolidated format
 */
function transformBook(source: SourceBook): ConsolidatedBook {
  return Object.freeze({
    isbn: source.id,
    title: source.title,
    authors: Object.freeze([...source.authors]),
    description: source.description,
    type: 'technical',
    categories: Object.freeze(source.tags ? [...source.tags] : []),
    format: 'pdf',
    available: false,
  });
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
 * Main consolidation function
 */
async function consolidateBooks(): Promise<ConsolidationResult> {
  console.log('Starting book consolidation...');
  console.log(`Source directory: ${SOURCE_DIR}`);
  console.log(`Output file: ${OUTPUT_FILE}`);

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

  // Process each file in alphabetical order
  for (const file of jsonFiles) {
    const filePath = join(SOURCE_DIR, file);
    console.log(`Processing: ${file}`);

    const books = await readJsonFile(filePath);
    totalBooksRead += books.length;

    for (const book of books) {
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

  // Write consolidated output
  await writeFile(OUTPUT_FILE, JSON.stringify(consolidatedBooks, null, 2), 'utf-8');

  const result: ConsolidationResult = Object.freeze({
    totalFiles: jsonFiles.length,
    totalBooksRead,
    uniqueBooks: consolidatedBooks.length,
    duplicatesSkipped,
    outputPath: OUTPUT_FILE,
  });

  console.log('\n--- Consolidation Complete ---');
  console.log(`Files processed: ${result.totalFiles}`);
  console.log(`Total books read: ${result.totalBooksRead}`);
  console.log(`Unique books: ${result.uniqueBooks}`);
  console.log(`Duplicates skipped: ${result.duplicatesSkipped}`);
  console.log(`Output written to: ${result.outputPath}`);

  return result;
}

// Run if executed directly
consolidateBooks().catch((error: unknown) => {
  console.error('Consolidation failed:', error);
  process.exit(1);
});

export { consolidateBooks, transformBook, isValidSourceBook };
export type { SourceBook, ConsolidatedBook, ConsolidationResult };
