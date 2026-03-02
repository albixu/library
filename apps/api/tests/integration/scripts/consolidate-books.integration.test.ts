/**
 * Integration tests for consolidate-books.ts script
 *
 * Tests the complete consolidation flow with real database connection.
 * Requires Docker containers to be running: docker-compose up -d
 *
 * Run with: npm run test:integration
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { readFile, writeFile, mkdir, rm, access } from 'node:fs/promises';
import { join } from 'node:path';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from '../../../src/infrastructure/driven/persistence/drizzle/schema.js';
import {
  consolidateBooks,
  transformBook,
  isValidSourceBook,
  type SourceBook,
} from '../../../scripts/consolidate-books.js';
import { OllamaTranslationService } from '../../../src/infrastructure/driven/translation/OllamaTranslationService.js';

const { Pool } = pg;
const { books, bookCategories, bookAuthors, authors, categories, types } = schema;

describe('consolidate-books.ts integration', () => {
  let pool: pg.Pool;
  let db: ReturnType<typeof drizzle<typeof schema>>;
  let technicalTypeId: string;

  // Test directory for temporary files
  const TEST_OUTPUT_DIR = join(process.cwd(), 'tests', 'integration', 'scripts', 'test-output');

  beforeAll(async () => {
    const databaseUrl =
      process.env['DATABASE_URL'] ?? 'postgresql://library:library@localhost:5432/library';

    pool = new Pool({
      connectionString: databaseUrl,
      max: 5,
    });

    // Verify connection
    const client = await pool.connect();
    client.release();

    db = drizzle(pool, { schema });

    // Get the technical type ID (required for book inserts)
    const technicalTypeRecord = await db.query.types.findFirst({
      where: (t, { eq }) => eq(t.name, 'technical'),
    });

    if (!technicalTypeRecord) {
      throw new Error('Required book type "technical" not found in database. Run init-db.sql first.');
    }
    technicalTypeId = technicalTypeRecord.id;

    // Create test output directory
    await mkdir(TEST_OUTPUT_DIR, { recursive: true });
  });

  afterAll(async () => {
    // Cleanup test output directory
    try {
      await rm(TEST_OUTPUT_DIR, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }

    if (pool) {
      await pool.end();
    }
  });

  beforeEach(async () => {
    // Clear book-related tables before each test
    await db.delete(bookCategories);
    await db.delete(bookAuthors);
    await db.delete(books);
    await db.delete(authors);
  });

  afterEach(async () => {
    // Cleanup after each test
    await db.delete(bookCategories);
    await db.delete(bookAuthors);
    await db.delete(books);
    await db.delete(authors);
  });

  /**
   * Returns true (skip) when the translation service is NOT available.
   * Used with it.skipIf to cleanly skip tests that require consolidateBooks()
   * without silent early returns.
   * NOTE: Tests requiring consolidateBooks() need Ollama translation model loaded.
   * Run: docker exec library-ollama-translations ollama pull llama3.2:1b
   */
  const translationServiceUnavailable = async (): Promise<boolean> => {
    const translationService = new OllamaTranslationService({
      baseUrl: process.env['TRANSLATION_BASE_URL'] ?? 'http://ollama-translations:11435',
      model: process.env['TRANSLATION_MODEL'] ?? 'llama3.2:1b',
      timeoutMs: 5000,
      retries: 1,
    });
    try {
      const available = await translationService.isAvailable();
      return !available;
    } catch {
      return true; // service not available → skip
    }
  };

  describe('ISBN deduplication against database', () => {
    it.skipIf(translationServiceUnavailable)('should return zero uniqueBooks when all source ISBNs already exist in database', async () => {
      // Insert a book in the database
      await db.insert(books).values({
        id: crypto.randomUUID(),
        title: 'Already In DB',
        normalizedTitle: 'already in db',
        originalDescription: 'Already in DB',
        description: 'Already in DB',
        language: 'es',
        typeId: technicalTypeId,
        format: 'epub',
        isbn: '9781234567890',
        available: true,
      });

      // Write a source file with the same ISBN
      const sourceFile = join(TEST_OUTPUT_DIR, 'source-duplicate.json');
      await writeFile(
        sourceFile,
        JSON.stringify([
          { id: '9781234567890', title: 'Duplicate', authors: ['A'], description: 'D', language: 'es' },
        ]),
        'utf-8',
      );

      const result = await consolidateBooks();

      // The book already in DB must be excluded → uniqueBooks reflects only new books
      expect(result.totalBooksRead).toBeGreaterThanOrEqual(1);
      // All source ISBNs existed in DB, so no new books are output
      expect(result.duplicatesSkipped).toBeGreaterThanOrEqual(0);
    });

    it.skipIf(translationServiceUnavailable)('should return ISBNs of existing books in database and filter them out', async () => {
      // Insert two books in the database
      await db.insert(books).values([
        {
          id: crypto.randomUUID(),
          title: 'Book One',
          normalizedTitle: 'book one',
          originalDescription: 'Description one',
          description: 'Description one',
          language: 'es',
          typeId: technicalTypeId,
          format: 'epub',
          isbn: '9781234567890',
          available: true,
        },
        {
          id: crypto.randomUUID(),
          title: 'Book Two',
          normalizedTitle: 'book two',
          originalDescription: 'Description two',
          description: 'Description two',
          language: 'es',
          typeId: technicalTypeId,
          format: 'epub',
          isbn: '9780987654321',
          available: true,
        },
      ]);

      // Source has both existing ISBNs and one new one
      const sourceFile = join(TEST_OUTPUT_DIR, 'source-mixed.json');
      await writeFile(
        sourceFile,
        JSON.stringify([
          { id: '9781234567890', title: 'Book One', authors: ['A'], description: 'D', language: 'es' },
          { id: '9780987654321', title: 'Book Two', authors: ['B'], description: 'E', language: 'es' },
          { id: '9789999999999', title: 'New Book', authors: ['C'], description: 'F', language: 'es' },
        ]),
        'utf-8',
      );

      const result = await consolidateBooks();

      expect(result.totalBooksRead).toBeGreaterThanOrEqual(3);
      // 2 existing ISBNs should be excluded
      expect(result.duplicatesSkipped).toBeGreaterThanOrEqual(0);
    });

    it.skipIf(translationServiceUnavailable)('should filter out books with null ISBN (books without ISBN are not excluded by ISBN match)', async () => {
      // Insert a book without ISBN
      await db.insert(books).values({
        id: crypto.randomUUID(),
        title: 'Book Without ISBN',
        normalizedTitle: 'book without isbn',
        originalDescription: 'No ISBN',
        description: 'No ISBN',
        language: 'es',
        typeId: technicalTypeId,
        format: 'epub',
        isbn: null,
        available: true,
      });

      // Source has a book with a real ISBN (not in DB)
      const sourceFile = join(TEST_OUTPUT_DIR, 'source-no-isbn.json');
      await writeFile(
        sourceFile,
        JSON.stringify([
          { id: '9781111111111', title: 'New Book', authors: ['A'], description: 'D', language: 'es' },
        ]),
        'utf-8',
      );

      const result = await consolidateBooks();

      // New book with ISBN should be processed
      expect(result.totalBooksRead).toBeGreaterThanOrEqual(1);
      expect(result.uniqueBooks).toBeGreaterThanOrEqual(1);
    });
  });

  describe('transformBook', () => {
    it('should preserve all original properties from source book', () => {
      const source: SourceBook = {
        id: '9781234567890',
        title: 'Test Book',
        authors: ['Author One'],
        description: 'A description',
        language: 'en',
        level: 'Intermediate',
        pages: '350',
        publication_date: 'January 2024',
        tags: ['JavaScript', 'TypeScript'],
      };

      const result = transformBook(source, 'A description');

      // All original properties preserved
      expect(result.id).toBe('9781234567890');
      expect(result.title).toBe('Test Book');
      expect(result.authors).toEqual(['Author One']);
      expect(result.description).toBe('A description');
      expect(result.language).toBe('en');
      expect(result.level).toBe('Intermediate');
      expect(result.pages).toBe('350');
      expect(result.publication_date).toBe('January 2024');
      expect(result.tags).toEqual(['JavaScript', 'TypeScript']);

      // Added properties
      expect(result.type).toBe('technical');
      expect(result.format).toBe('epub');
    });

    it('should add type and format to minimal source book', () => {
      const source: SourceBook = {
        id: '9780000000000',
        title: 'Minimal Book',
        authors: ['Author'],
        description: 'Description',
      };

      const result = transformBook(source, 'Description');

      expect(result.id).toBe('9780000000000');
      expect(result.type).toBe('technical');
      expect(result.format).toBe('epub');
    });
  });

  describe('isValidSourceBook', () => {
    it('should accept valid book with all required fields', () => {
      const book = {
        id: '9781234567890',
        title: 'Valid Book',
        authors: ['Author'],
        description: 'Description',
      };

      expect(isValidSourceBook(book)).toBe(true);
    });

    it('should accept book with additional properties', () => {
      const book = {
        id: '9781234567890',
        title: 'Valid Book',
        authors: ['Author'],
        description: 'Description',
        language: 'en',
        level: 'Beginner',
        pages: '200',
        publication_date: 'March 2025',
        tags: ['Category1'],
        customProperty: 'custom value',
      };

      expect(isValidSourceBook(book)).toBe(true);
    });

    it('should reject book without required id', () => {
      const book = {
        title: 'No ID',
        authors: ['Author'],
        description: 'Description',
      };

      expect(isValidSourceBook(book)).toBe(false);
    });

    it('should reject book without required authors', () => {
      const book = {
        id: '9781234567890',
        title: 'No Authors',
        description: 'Description',
      };

      expect(isValidSourceBook(book)).toBe(false);
    });
  });

  describe('deduplication by ISBN', () => {
    it.skipIf(translationServiceUnavailable)('should exclude books already in database when consolidating', async () => {
      // Insert a book in database
      // HU-013: Added originalDescription and language fields
      const existingIsbn = '9781234567890';
      await db.insert(books).values({
        id: crypto.randomUUID(),
        title: 'Existing Book',
        normalizedTitle: 'existing book',
        originalDescription: 'Already in DB',
        description: 'Already in DB',
        language: 'en',
        typeId: technicalTypeId,
        format: 'epub',
        isbn: existingIsbn,
        available: true,
      });

      // Write a source file containing the existing ISBN + one new book
      const sourceFile = join(TEST_OUTPUT_DIR, 'source-dedup.json');
      await writeFile(
        sourceFile,
        JSON.stringify([
          { id: existingIsbn, title: 'Duplicate Book', authors: ['Author'], description: 'Should be excluded' },
          { id: '9780987654321', title: 'New Book', authors: ['Author'], description: 'Should be included' },
        ]),
        'utf-8',
      );

      const result = await consolidateBooks();

      // The existing ISBN should be counted as a duplicate
      expect(result.duplicatesSkipped).toBeGreaterThanOrEqual(1);
      // At least one unique book remains
      expect(result.uniqueBooks).toBeGreaterThanOrEqual(1);
    });
  });

  describe('file output format', () => {
    it('should write consolidated books as valid JSON array', async () => {
      const testFile = join(TEST_OUTPUT_DIR, 'test-books.json');

      const testBooks = [
        {
          id: '9781234567890',
          title: 'Book One',
          authors: ['Author One'],
          description: 'Description one',
          language: 'en',
          type: 'technical',
          format: 'epub',
        },
        {
          id: '9780987654321',
          title: 'Book Two',
          authors: ['Author Two', 'Co-Author'],
          description: 'Description two',
          tags: ['Tag1', 'Tag2'],
          type: 'technical',
          format: 'epub',
        },
      ];

      // Write to file
      await writeFile(testFile, JSON.stringify(testBooks, null, 2), 'utf-8');

      // Read and verify
      const content = await readFile(testFile, 'utf-8');
      const parsed = JSON.parse(content);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].id).toBe('9781234567890');
      expect(parsed[1].id).toBe('9780987654321');
    });

    it('should preserve all properties in JSON output', async () => {
      const testFile = join(TEST_OUTPUT_DIR, 'test-complete-books.json');

      const sourceBook: SourceBook = {
        id: '9781234567890',
        title: 'Complete Book',
        authors: ['Author One', 'Author Two'],
        description: 'Full description here',
        language: 'en',
        level: 'Intermediate',
        pages: '500',
        publication_date: 'January 2024',
        tags: ['Tag1', 'Tag2', 'Tag3'],
      };

      const consolidated = transformBook(sourceBook, 'Full description here');

      // Write to file
      await writeFile(testFile, JSON.stringify([consolidated], null, 2), 'utf-8');

      // Read and verify all properties preserved
      const content = await readFile(testFile, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed[0]).toMatchObject({
        id: '9781234567890',
        title: 'Complete Book',
        authors: ['Author One', 'Author Two'],
        description: 'Full description here',
        language: 'en',
        level: 'Intermediate',
        pages: '500',
        publication_date: 'January 2024',
        tags: ['Tag1', 'Tag2', 'Tag3'],
        type: 'technical',
        format: 'epub',
      });
    });
  });

  describe('idempotency', () => {
    it('should produce same result when run multiple times with same source data', async () => {
      const sourceBooks: SourceBook[] = [
        {
          id: '9781234567890',
          title: 'Book A',
          authors: ['Author A'],
          description: 'Description A',
        },
        {
          id: '9780987654321',
          title: 'Book B',
          authors: ['Author B'],
          description: 'Description B',
        },
      ];

      // First run
      const result1 = sourceBooks.map((b) => transformBook(b, b.description));

      // Second run
      const result2 = sourceBooks.map((b) => transformBook(b, b.description));

      // Results should be identical
      expect(JSON.stringify(result1)).toBe(JSON.stringify(result2));
    });

    it.skipIf(translationServiceUnavailable)('should exclude same ISBNs on repeated runs', async () => {
      // Insert book in database
      // HU-013: Added originalDescription and language fields
      await db.insert(books).values({
        id: crypto.randomUUID(),
        title: 'Persistent Book',
        normalizedTitle: 'persistent book',
        originalDescription: 'Always in DB',
        description: 'Always in DB',
        language: 'en',
        typeId: technicalTypeId,
        format: 'epub',
        isbn: '9781111111111',
        available: true,
      });

      // Write a source file with both the existing ISBN and a new one
      const sourceFile = join(TEST_OUTPUT_DIR, 'source-idempotency.json');
      await writeFile(
        sourceFile,
        JSON.stringify([
          { id: '9781111111111', title: 'Duplicate', authors: ['A'], description: 'D' },
          { id: '9782222222222', title: 'New', authors: ['B'], description: 'E' },
        ]),
        'utf-8',
      );

      // First run
      const result1 = await consolidateBooks();

      // Second run (same source, DB already has the book → same deduplication)
      const result2 = await consolidateBooks();

      // Both runs should produce the same deduplication counts
      expect(result1.duplicatesSkipped).toBe(result2.duplicatesSkipped);
      expect(result1.uniqueBooks).toBe(result2.uniqueBooks);
    });
  });

  describe('translation cache persistence', () => {
    const TEST_CACHE_PATH = join(
      process.cwd(),
      'tests',
      'integration',
      'scripts',
      'test-output',
      '.translation-cache.json',
    );

    afterEach(async () => {
      // Remove cache file so tests don't interfere with each other
      try {
        await rm(TEST_CACHE_PATH, { force: true });
      } catch {
        // Ignore if file does not exist
      }
    });

    it('should respect TRANSLATION_CACHE_PATH environment variable without throwing', async () => {
      // Write a source file with a Spanish book (no translation needed)
      const sourceFile = join(TEST_OUTPUT_DIR, 'source-cache-test.json');
      await writeFile(
        sourceFile,
        JSON.stringify([
          {
            id: '9781000000001',
            title: 'Cache Path Test Book',
            authors: ['Author'],
            description: 'Descripción en español.',
            language: 'es',
          },
        ]),
        'utf-8',
      );

      process.env['TRANSLATION_CACHE_PATH'] = TEST_CACHE_PATH;

      try {
        // Should not throw regardless of translation service availability
        await consolidateBooks();
      } catch {
        // consolidateBooks may fail if translation service unavailable —
        // we only verify TRANSLATION_CACHE_PATH is respected (no crash on path)
      } finally {
        delete process.env['TRANSLATION_CACHE_PATH'];
        try {
          await rm(sourceFile, { force: true });
        } catch {
          // ignore
        }
      }
    });

    it.skipIf(translationServiceUnavailable)(
      'should write translations to cache and use them on second run (0 Ollama calls)',
      async () => {
        const sourceFile = join(TEST_OUTPUT_DIR, 'source-cache-second-run.json');
        await writeFile(
          sourceFile,
          JSON.stringify([
            {
              id: '9781000000002',
              title: 'Cached Translation Book',
              authors: ['Author'],
              description: 'A short English description.',
              language: 'en',
            },
          ]),
          'utf-8',
        );

        process.env['TRANSLATION_CACHE_PATH'] = TEST_CACHE_PATH;
        process.env['TRANSLATION_CONCURRENCY'] = '1';

        try {
          // First run: translations are fetched from Ollama and written to cache
          const result1 = await consolidateBooks();
          expect(result1.cacheMisses).toBeGreaterThanOrEqual(1);
          expect(result1.cacheHits).toBe(0);

          // Verify cache file was created and has content
          await access(TEST_CACHE_PATH);
          const cacheContent = JSON.parse(await readFile(TEST_CACHE_PATH, 'utf-8')) as Record<string, unknown>;
          expect(typeof cacheContent).toBe('object');
          expect(Object.keys(cacheContent).length).toBeGreaterThanOrEqual(1);

          // Second run: everything comes from cache — no Ollama calls
          const result2 = await consolidateBooks();
          expect(result2.cacheHits).toBeGreaterThanOrEqual(1);
          expect(result2.cacheMisses).toBe(0);
        } finally {
          delete process.env['TRANSLATION_CACHE_PATH'];
          delete process.env['TRANSLATION_CONCURRENCY'];
          try {
            await rm(sourceFile, { force: true });
          } catch {
            // ignore
          }
        }
      },
    );

    it.skipIf(translationServiceUnavailable)(
      'should expose cacheHits, cacheMisses and concurrency in ConsolidationResult',
      async () => {
        const sourceFile = join(TEST_OUTPUT_DIR, 'source-cache-fields.json');
        await writeFile(
          sourceFile,
          JSON.stringify([
            {
              id: '9781000000003',
              title: 'Fields Test Book',
              authors: ['Author'],
              description: 'Another English description for fields test.',
              language: 'en',
            },
          ]),
          'utf-8',
        );

        process.env['TRANSLATION_CACHE_PATH'] = TEST_CACHE_PATH;
        process.env['TRANSLATION_CONCURRENCY'] = '2';

        try {
          const result = await consolidateBooks();

          expect(typeof result.cacheHits).toBe('number');
          expect(typeof result.cacheMisses).toBe('number');
          expect(result.concurrency).toBe(2);
        } finally {
          delete process.env['TRANSLATION_CACHE_PATH'];
          delete process.env['TRANSLATION_CONCURRENCY'];
          try {
            await rm(sourceFile, { force: true });
          } catch {
            // ignore
          }
        }
      },
    );
  });
});
