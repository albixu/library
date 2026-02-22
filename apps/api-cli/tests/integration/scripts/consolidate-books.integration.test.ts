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
  getExistingIsbns,
  transformBook,
  isValidSourceBook,
  type SourceBook,
} from '../../../scripts/consolidate-books.js';

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

  describe('getExistingIsbns', () => {
    it('should return empty set when no books exist in database', async () => {
      const result = await getExistingIsbns(db as any);

      expect(result).toBeInstanceOf(Set);
      expect(result.size).toBe(0);
    });

    it('should return ISBNs of existing books in database', async () => {
      // Insert test books directly into database
      // HU-013: Added originalDescription and language fields
      await db.insert(books).values([
        {
          id: crypto.randomUUID(),
          title: 'Book One',
          normalizedTitle: 'book one',
          originalDescription: 'Description one',
          description: 'Description one',
          language: 'en',
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
          language: 'en',
          typeId: technicalTypeId,
          format: 'epub',
          isbn: '9780987654321',
          available: true,
        },
      ]);

      const result = await getExistingIsbns(db as any);

      expect(result).toBeInstanceOf(Set);
      expect(result.size).toBe(2);
      expect(result.has('9781234567890')).toBe(true);
      expect(result.has('9780987654321')).toBe(true);
    });

    it('should filter out books with null ISBN', async () => {
      // Insert books with and without ISBN
      // HU-013: Added originalDescription and language fields
      await db.insert(books).values([
        {
          id: crypto.randomUUID(),
          title: 'Book With ISBN',
          normalizedTitle: 'book with isbn',
          originalDescription: 'Has ISBN',
          description: 'Has ISBN',
          language: 'en',
          typeId: technicalTypeId,
          format: 'epub',
          isbn: '9781111111111',
          available: true,
        },
        {
          id: crypto.randomUUID(),
          title: 'Book Without ISBN',
          normalizedTitle: 'book without isbn',
          originalDescription: 'No ISBN',
          description: 'No ISBN',
          language: 'en',
          typeId: technicalTypeId,
          format: 'epub',
          isbn: null,
          available: true,
        },
      ]);

      const result = await getExistingIsbns(db as any);

      expect(result.size).toBe(1);
      expect(result.has('9781111111111')).toBe(true);
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

      const result = transformBook(source);

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

      const result = transformBook(source);

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
    it('should identify books already in database as excludable', async () => {
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

      // Get existing ISBNs
      const existingIsbns = await getExistingIsbns(db as any);

      // Simulate consolidation logic
      const sourceBooks: SourceBook[] = [
        {
          id: existingIsbn, // This one should be excluded
          title: 'Duplicate Book',
          authors: ['Author'],
          description: 'Should be excluded',
        },
        {
          id: '9780987654321', // This one should be included
          title: 'New Book',
          authors: ['Author'],
          description: 'Should be included',
        },
      ];

      const newBooks = sourceBooks.filter((book) => !existingIsbns.has(book.id));

      expect(newBooks).toHaveLength(1);
      expect(newBooks[0]!.id).toBe('9780987654321');
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

      const consolidated = transformBook(sourceBook);

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
      const result1 = sourceBooks.map(transformBook);

      // Second run
      const result2 = sourceBooks.map(transformBook);

      // Results should be identical
      expect(JSON.stringify(result1)).toBe(JSON.stringify(result2));
    });

    it('should exclude same ISBNs on repeated runs', async () => {
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

      const sourceBooks: SourceBook[] = [
        { id: '9781111111111', title: 'Duplicate', authors: ['A'], description: 'D' },
        { id: '9782222222222', title: 'New', authors: ['B'], description: 'E' },
      ];

      // First run
      const existingIsbns1 = await getExistingIsbns(db as any);
      const newBooks1 = sourceBooks.filter((b) => !existingIsbns1.has(b.id));

      // Second run
      const existingIsbns2 = await getExistingIsbns(db as any);
      const newBooks2 = sourceBooks.filter((b) => !existingIsbns2.has(b.id));

      // Both runs should produce same filtered list
      expect(newBooks1.map((b) => b.id)).toEqual(newBooks2.map((b) => b.id));
      expect(newBooks1).toHaveLength(1);
      expect(newBooks1[0]!.id).toBe('9782222222222');
    });
  });
});
