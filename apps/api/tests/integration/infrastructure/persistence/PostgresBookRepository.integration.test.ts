/**
 * PostgresBookRepository Integration Tests
 *
 * Tests the BookRepository adapter against a real PostgreSQL database.
 * Requires Docker containers to be running: docker-compose up -d
 *
 * Run with: npm run test:integration
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { PostgresBookRepository } from '../../../../src/infrastructure/driven/persistence/PostgresBookRepository.js';
import { PostgresCategoryRepository } from '../../../../src/infrastructure/driven/persistence/PostgresCategoryRepository.js';
import { PostgresTypeRepository } from '../../../../src/infrastructure/driven/persistence/PostgresTypeRepository.js';
import { PostgresLevelRepository } from '../../../../src/infrastructure/driven/persistence/PostgresLevelRepository.js';
import { Book } from '../../../../src/domain/entities/Book.js';
import { Author } from '../../../../src/domain/entities/Author.js';
import { BookType } from '../../../../src/domain/entities/BookType.js';
import { Category } from '../../../../src/domain/entities/Category.js';
import { Level } from '../../../../src/domain/entities/Level.js';
import { Criteria } from '../../../../src/domain/criteria/Criteria.js';
import { Order } from '../../../../src/domain/criteria/Order.js';
import { DuplicateISBNError, BookNotFoundError } from '../../../../src/domain/errors/DomainErrors.js';
import * as schema from '../../../../src/infrastructure/driven/persistence/drizzle/schema.js';
import { generateUUID } from '../../../../src/shared/utils/uuid.js';

const { Pool } = pg;
const { categories, books, bookCategories, bookAuthors, authors, types, levels, typeLevels } = schema;

/**
 * Creates a valid 768-dimension embedding vector for tests
 */
function generateTestEmbedding(): number[] {
  return Array.from({ length: 768 }, () => Math.random() * 2 - 1);
}

describe('PostgresBookRepository Integration', () => {
  let pool: pg.Pool;
  let db: ReturnType<typeof drizzle>;
  let bookRepository: PostgresBookRepository;
  let categoryRepository: PostgresCategoryRepository;
  let typeRepository: PostgresTypeRepository;
  let levelRepository: PostgresLevelRepository;

  // Reusable test categories
  let programmingCategory: Category;
  let softwareCategory: Category;

  // Reusable test authors
  let robertMartin: Author;
  let martinFowler: Author;

  // Reusable test book types
  let technicalType: BookType;
  let novelType: BookType;

  // Reusable test levels (HU-008)
  let beginnerLevel: Level;
  let advancedLevel: Level;
  let intermediateToAdvancedLevel: Level;

  beforeAll(async () => {
    const databaseUrl = process.env['DATABASE_URL'] ?? 'postgresql://library:library@localhost:5432/library';
    
    pool = new Pool({
      connectionString: databaseUrl,
      max: 5,
    });

    const client = await pool.connect();
    client.release();

    db = drizzle(pool, { schema });
     
    bookRepository = new PostgresBookRepository(db as any);
     
    categoryRepository = new PostgresCategoryRepository(db as any);

    typeRepository = new PostgresTypeRepository(db as any);

    levelRepository = new PostgresLevelRepository(db as any);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    // Clean up test data (order matters due to FK constraints)
    await db.delete(bookCategories);
    await db.delete(bookAuthors);
    await db.delete(books);
    await db.delete(categories);
    await db.delete(authors);
    await db.delete(typeLevels); // HU-008: Delete type-level associations
    await db.delete(levels); // HU-008: Delete levels (after books since books reference levels)
    // Note: types table has seed data, don't delete it

    // Fetch existing types from DB (seed data from init-db.sql)
    const technicalTypeRecord = await db.query.types.findFirst({
      where: (t, { eq }) => eq(t.name, 'technical'),
    });
    const novelTypeRecord = await db.query.types.findFirst({
      where: (t, { eq }) => eq(t.name, 'novel'),
    });

    if (!technicalTypeRecord || !novelTypeRecord) {
      throw new Error('Required book types not found in database. Run init-db.sql first.');
    }

    technicalType = BookType.fromPersistence({
      id: technicalTypeRecord.id,
      name: technicalTypeRecord.name,
      createdAt: technicalTypeRecord.createdAt,
      updatedAt: technicalTypeRecord.updatedAt,
    });
    novelType = BookType.fromPersistence({
      id: novelTypeRecord.id,
      name: novelTypeRecord.name,
      createdAt: novelTypeRecord.createdAt,
      updatedAt: novelTypeRecord.updatedAt,
    });

    // Create reusable test levels (HU-008: levels are now entities)
    beginnerLevel = Level.create({ id: generateUUID(), name: 'Beginner' });
    advancedLevel = Level.create({ id: generateUUID(), name: 'Advanced' });
    intermediateToAdvancedLevel = Level.create({ id: generateUUID(), name: 'Intermediate to Advanced' });

    await levelRepository.save(beginnerLevel);
    await levelRepository.save(advancedLevel);
    await levelRepository.save(intermediateToAdvancedLevel);

    // Create reusable test categories (HU-008: now require typeId)
    programmingCategory = await categoryRepository.save(
      Category.create({ id: generateUUID(), name: 'Programming', typeId: technicalType.id })
    );
    softwareCategory = await categoryRepository.save(
      Category.create({ id: generateUUID(), name: 'Software Engineering', typeId: technicalType.id })
    );

    // Insert test authors into DB
    robertMartin = Author.create({ id: generateUUID(), name: 'Robert C. Martin' });
    martinFowler = Author.create({ id: generateUUID(), name: 'Martin Fowler' });
    
    await db.insert(authors).values([
      { id: robertMartin.id, name: robertMartin.name },
      { id: martinFowler.id, name: martinFowler.name },
    ]);
  });

  describe('save', () => {
    it('should save a book with embedding, authors, and categories', async () => {
      const book = Book.create({
        id: generateUUID(),
        title: 'Clean Code',
        authors: [robertMartin],
        description: 'A handbook of agile software craftsmanship',
        language: 'en',
        type: technicalType,
        format: 'pdf',
        categories: [programmingCategory, softwareCategory],
        isbn: '9780132350884',
        available: true,
        path: '/books/clean-code.pdf',
      });

      const embedding = generateTestEmbedding();
      const saved = await bookRepository.save({ book, embedding });

      expect(saved.id).toBe(book.id);
      expect(saved.title).toBe('Clean Code');
      expect(saved.authors).toHaveLength(1);
      expect(saved.authors[0].name).toBe('Robert C. Martin');
      expect(saved.type.name).toBe('technical');
      expect(saved.categories).toHaveLength(2);
      expect(saved.isbn?.value).toBe('9780132350884');
      expect(saved.levelId).toBeNull(); // No level specified
    });

    it('should save a book with level', async () => {
      const book = Book.create({
        id: generateUUID(),
        title: 'Advanced TypeScript',
        authors: [martinFowler],
        description: 'Deep dive into TypeScript advanced patterns',
        language: 'en',
        type: technicalType,
        format: 'pdf',
        categories: [programmingCategory],
        levelId: advancedLevel.id, // HU-008: Use levelId (UUID)
      });

      const embedding = generateTestEmbedding();
      const saved = await bookRepository.save({ book, embedding });

      expect(saved.id).toBe(book.id);
      expect(saved.title).toBe('Advanced TypeScript');
      expect(saved.levelId).toBe(advancedLevel.id); // HU-008: Check levelId
    });

    it('should save a book with compound level', async () => {
      const book = Book.create({
        id: generateUUID(),
        title: 'Intermediate to Advanced Patterns',
        authors: [robertMartin],
        description: 'Bridge course for intermediate developers',
        language: 'en',
        type: technicalType,
        format: 'epub',
        categories: [softwareCategory],
        levelId: intermediateToAdvancedLevel.id, // HU-008: Use levelId (UUID)
      });

      const embedding = generateTestEmbedding();
      const saved = await bookRepository.save({ book, embedding });

      expect(saved.levelId).toBe(intermediateToAdvancedLevel.id); // HU-008: Check levelId
    });

    it('should save a book without ISBN', async () => {
      const unknownAuthor = Author.create({ id: generateUUID(), name: 'Unknown Author' });
      await db.insert(authors).values({ id: unknownAuthor.id, name: unknownAuthor.name });

      const book = Book.create({
        id: generateUUID(),
        title: 'No ISBN Book',
        authors: [unknownAuthor],
        description: 'A book without ISBN',
        language: 'en',
        type: novelType,
        format: 'epub',
        categories: [programmingCategory],
      });

      const saved = await bookRepository.save({
        book,
        embedding: generateTestEmbedding(),
      });

      expect(saved.isbn).toBeNull();
    });

    it('should throw DuplicateISBNError for duplicate ISBN', async () => {
      const authorOne = Author.create({ id: generateUUID(), name: 'Author One' });
      await db.insert(authors).values({ id: authorOne.id, name: authorOne.name });

      const book1 = Book.create({
        id: generateUUID(),
        title: 'First Book',
        authors: [authorOne],
        description: 'Description one',
        language: 'en',
        type: technicalType,
        format: 'pdf',
        categories: [programmingCategory],
        isbn: '9780132350884',
      });

      await bookRepository.save({ book: book1, embedding: generateTestEmbedding() });

      const differentAuthor = Author.create({ id: generateUUID(), name: 'Different Author' });
      await db.insert(authors).values({ id: differentAuthor.id, name: differentAuthor.name });

      const book2 = Book.create({
        id: generateUUID(),
        title: 'Different Book',
        authors: [differentAuthor],
        description: 'Description two',
        language: 'en',
        type: novelType,
        format: 'epub',
        categories: [programmingCategory],
        isbn: '9780132350884', // Same ISBN
      });

      await expect(
        bookRepository.save({ book: book2, embedding: generateTestEmbedding() })
      ).rejects.toThrow(DuplicateISBNError);
    });

    it('should allow books with same title and different authors (no triad check)', async () => {
      // With multi-author model, there's no triad duplicate detection
      // Same title/format with different authors should be allowed
      const sameAuthor = Author.create({ id: generateUUID(), name: 'Same Author' });
      await db.insert(authors).values({ id: sameAuthor.id, name: sameAuthor.name });

      const book1 = Book.create({
        id: generateUUID(),
        title: 'Same Title',
        authors: [sameAuthor],
        description: 'Description one',
        language: 'en',
        type: technicalType,
        format: 'pdf',
        categories: [programmingCategory],
      });

      await bookRepository.save({ book: book1, embedding: generateTestEmbedding() });

      // Different author, same title/format - should be allowed now
      const differentAuthor = Author.create({ id: generateUUID(), name: 'Different Author' });
      await db.insert(authors).values({ id: differentAuthor.id, name: differentAuthor.name });

      const book2 = Book.create({
        id: generateUUID(),
        title: 'Same Title',
        authors: [differentAuthor],
        description: 'Different description',
        language: 'en',
        type: novelType,
        format: 'pdf', // Same format
        categories: [softwareCategory],
      });

      // This should NOT throw - triad check has been removed
      const saved = await bookRepository.save({ book: book2, embedding: generateTestEmbedding() });
      expect(saved.title).toBe('Same Title');
    });
  });

  describe('findById', () => {
    it('should find an existing book with authors, type, and categories', async () => {
      const testAuthor = Author.create({ id: generateUUID(), name: 'Test Author' });
      await db.insert(authors).values({ id: testAuthor.id, name: testAuthor.name });

      const book = Book.create({
        id: generateUUID(),
        title: 'Findable Book',
        authors: [testAuthor],
        description: 'Test description',
        language: 'en',
        type: technicalType,
        format: 'pdf',
        categories: [programmingCategory, softwareCategory],
      });

      await bookRepository.save({ book, embedding: generateTestEmbedding() });

      const found = await bookRepository.findById(book.id);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(book.id);
      expect(found!.title).toBe('Findable Book');
      expect(found!.authors).toHaveLength(1);
      expect(found!.authors[0].name).toBe('Test Author');
      expect(found!.type.name).toBe('technical');
      expect(found!.categories).toHaveLength(2);
    });

    it('should find a book with level', async () => {
      const testAuthor = Author.create({ id: generateUUID(), name: 'Level Test Author' });
      await db.insert(authors).values({ id: testAuthor.id, name: testAuthor.name });

      const book = Book.create({
        id: generateUUID(),
        title: 'Book With Level',
        authors: [testAuthor],
        description: 'Test description with level',
        language: 'en',
        type: technicalType,
        format: 'pdf',
        categories: [programmingCategory],
        levelId: beginnerLevel.id, // HU-008: Use levelId (UUID)
      });

      await bookRepository.save({ book, embedding: generateTestEmbedding() });

      const found = await bookRepository.findById(book.id);

      expect(found).not.toBeNull();
      expect(found!.levelId).toBe(beginnerLevel.id); // HU-008: Check levelId
    });

    it('should find a book with null level', async () => {
      const testAuthor = Author.create({ id: generateUUID(), name: 'Null Level Author' });
      await db.insert(authors).values({ id: testAuthor.id, name: testAuthor.name });

      const book = Book.create({
        id: generateUUID(),
        title: 'Book Without Level',
        authors: [testAuthor],
        description: 'Test description without level',
        language: 'en',
        type: technicalType,
        format: 'epub',
        categories: [softwareCategory],
        // No levelId specified
      });

      await bookRepository.save({ book, embedding: generateTestEmbedding() });

      const found = await bookRepository.findById(book.id);

      expect(found).not.toBeNull();
      expect(found!.levelId).toBeNull(); // HU-008: Check levelId
    });

    it('should return null for non-existent ID', async () => {
      const found = await bookRepository.findById(generateUUID());
      expect(found).toBeNull();
    });
  });

  describe('findByIsbn', () => {
    it('should find a book by ISBN', async () => {
      const isbnAuthor = Author.create({ id: generateUUID(), name: 'ISBN Author' });
      await db.insert(authors).values({ id: isbnAuthor.id, name: isbnAuthor.name });

      const book = Book.create({
        id: generateUUID(),
        title: 'ISBN Book',
        authors: [isbnAuthor],
        description: 'Test description',
        language: 'en',
        type: technicalType,
        format: 'pdf',
        categories: [programmingCategory],
        isbn: '9780132350884',
      });

      await bookRepository.save({ book, embedding: generateTestEmbedding() });

      const found = await bookRepository.findByIsbn('9780132350884');

      expect(found).not.toBeNull();
      expect(found!.isbn?.value).toBe('9780132350884');
    });

    it('should return null for non-existent ISBN', async () => {
      const found = await bookRepository.findByIsbn('9999999999999');
      expect(found).toBeNull();
    });
  });

  describe('checkDuplicate', () => {
    it('should detect ISBN duplicate', async () => {
      const existingAuthor = Author.create({ id: generateUUID(), name: 'Existing Author' });
      await db.insert(authors).values({ id: existingAuthor.id, name: existingAuthor.name });

      const book = Book.create({
        id: generateUUID(),
        title: 'Existing Book',
        authors: [existingAuthor],
        description: 'Description',
        language: 'en',
        type: technicalType,
        format: 'pdf',
        categories: [programmingCategory],
        isbn: '9780132350884',
      });

      await bookRepository.save({ book, embedding: generateTestEmbedding() });

      const result = await bookRepository.checkDuplicate({
        isbn: '9780132350884',
      });

      expect(result.isDuplicate).toBe(true);
      expect(result.duplicateType).toBe('isbn');
    });

    it('should return isDuplicate false when no ISBN duplicate exists', async () => {
      const result = await bookRepository.checkDuplicate({
        isbn: '9780132350884',
      });

      expect(result.isDuplicate).toBe(false);
    });

    it('should return isDuplicate false when no ISBN provided', async () => {
      const result = await bookRepository.checkDuplicate({});

      expect(result.isDuplicate).toBe(false);
    });

    it('should return isDuplicate false when ISBN is null', async () => {
      const result = await bookRepository.checkDuplicate({ isbn: null });

      expect(result.isDuplicate).toBe(false);
    });
  });

  describe('update', () => {
    it('should update mutable fields (available, path)', async () => {
      const updateAuthor = Author.create({ id: generateUUID(), name: 'Update Author' });
      await db.insert(authors).values({ id: updateAuthor.id, name: updateAuthor.name });

      const book = Book.create({
        id: generateUUID(),
        title: 'Updatable Book',
        authors: [updateAuthor],
        description: 'Description',
        language: 'en',
        type: technicalType,
        format: 'pdf',
        categories: [programmingCategory],
        available: false,
        path: null,
      });

      await bookRepository.save({ book, embedding: generateTestEmbedding() });

      const updated = await bookRepository.update({
        id: book.id,
        available: true,
        path: '/new/path.pdf',
      });

      expect(updated.available).toBe(true);
      expect(updated.path).toBe('/new/path.pdf');
    });

    it('should throw BookNotFoundError for non-existent book', async () => {
      await expect(
        bookRepository.update({
          id: generateUUID(),
          available: true,
        })
      ).rejects.toThrow(BookNotFoundError);
    });
  });

  describe('delete', () => {
    it('should delete an existing book', async () => {
      const deleteAuthor = Author.create({ id: generateUUID(), name: 'Delete Author' });
      await db.insert(authors).values({ id: deleteAuthor.id, name: deleteAuthor.name });

      const book = Book.create({
        id: generateUUID(),
        title: 'Deletable Book',
        authors: [deleteAuthor],
        description: 'Description',
        language: 'en',
        type: technicalType,
        format: 'pdf',
        categories: [programmingCategory],
      });

      await bookRepository.save({ book, embedding: generateTestEmbedding() });

      const deleted = await bookRepository.delete(book.id);
      expect(deleted).toBe(true);

      const found = await bookRepository.findById(book.id);
      expect(found).toBeNull();
    });

    it('should return false for non-existent book', async () => {
      const deleted = await bookRepository.delete(generateUUID());
      expect(deleted).toBe(false);
    });
  });

  describe('findAll and count', () => {
    it('should return all books', async () => {
      const authorOne = Author.create({ id: generateUUID(), name: 'Author One' });
      const authorTwo = Author.create({ id: generateUUID(), name: 'Author Two' });
      await db.insert(authors).values([
        { id: authorOne.id, name: authorOne.name },
        { id: authorTwo.id, name: authorTwo.name },
      ]);

      const book1 = Book.create({
        id: generateUUID(),
        title: 'Book One',
        authors: [authorOne],
        description: 'Desc one',
        language: 'en',
        type: technicalType,
        format: 'pdf',
        categories: [programmingCategory],
      });

      const book2 = Book.create({
        id: generateUUID(),
        title: 'Book Two',
        authors: [authorTwo],
        description: 'Desc two',
        language: 'en',
        type: novelType,
        format: 'epub',
        categories: [softwareCategory],
      });

      await bookRepository.save({ book: book1, embedding: generateTestEmbedding() });
      await bookRepository.save({ book: book2, embedding: generateTestEmbedding() });

      const allBooks = await bookRepository.findAll();
      expect(allBooks).toHaveLength(2);

      const count = await bookRepository.count();
      expect(count).toBe(2);
    });

    it('should return books with different levels', async () => {
      const authorOne = Author.create({ id: generateUUID(), name: 'Level Author One' });
      const authorTwo = Author.create({ id: generateUUID(), name: 'Level Author Two' });
      await db.insert(authors).values([
        { id: authorOne.id, name: authorOne.name },
        { id: authorTwo.id, name: authorTwo.name },
      ]);

      const beginnerBook = Book.create({
        id: generateUUID(),
        title: 'Beginner Book',
        authors: [authorOne],
        description: 'For beginners',
        language: 'en',
        type: technicalType,
        format: 'pdf',
        categories: [programmingCategory],
        levelId: beginnerLevel.id, // HU-008: Use levelId (UUID)
      });

      const advancedBook = Book.create({
        id: generateUUID(),
        title: 'Advanced Book',
        authors: [authorTwo],
        description: 'For experts',
        language: 'en',
        type: technicalType,
        format: 'pdf',
        categories: [programmingCategory],
        levelId: advancedLevel.id, // HU-008: Use levelId (UUID)
      });

      await bookRepository.save({ book: beginnerBook, embedding: generateTestEmbedding() });
      await bookRepository.save({ book: advancedBook, embedding: generateTestEmbedding() });

      const allBooks = await bookRepository.findAll();
      expect(allBooks).toHaveLength(2);

      // HU-008: Check levelIds instead of level?.value
      const levelIds = allBooks.map(b => b.levelId).sort();
      expect(levelIds).toEqual([advancedLevel.id, beginnerLevel.id].sort());
    });

    it('should return empty array and count 0 when no books exist', async () => {
      const allBooks = await bookRepository.findAll();
      expect(allBooks).toEqual([]);

      const count = await bookRepository.count();
      expect(count).toBe(0);
    });
  });

  describe('search', () => {
    // Helper to create and save a test book
    // HU-013: Added language field (required)
    async function createTestBook(options: {
      title: string;
      authors: Author[];
      type: BookType;
      categories: Category[];
      levelId?: string;
      isbn?: string;
      description?: string;
      language?: string; // HU-013: defaults to 'en'
      embedding?: number[];
    }): Promise<Book> {
      const book = Book.create({
        id: generateUUID(),
        title: options.title,
        authors: options.authors,
        description: options.description ?? `Description for ${options.title}`,
        language: options.language ?? 'en', // HU-013: default to English
        type: options.type,
        format: 'pdf',
        categories: options.categories,
        levelId: options.levelId,
        isbn: options.isbn,
      });

      await bookRepository.save({
        book,
        embedding: options.embedding ?? generateTestEmbedding(),
      });

      return book;
    }

    describe('basic search without filters', () => {
      it('should return all books when no filters applied', async () => {
        await createTestBook({
          title: 'Book A',
          authors: [robertMartin],
          type: technicalType,
          categories: [programmingCategory],
        });
        await createTestBook({
          title: 'Book B',
          authors: [martinFowler],
          type: novelType,
          categories: [softwareCategory],
        });

        const criteria = Criteria.empty();
        const result = await bookRepository.search(criteria);

        expect(result.items).toHaveLength(2);
        expect(result.totalCount).toBe(2);
        expect(result.hasNextPage).toBe(false);
        expect(result.nextCursor).toBeNull();
      });

      it('should return empty result when no books exist', async () => {
        const criteria = Criteria.empty();
        const result = await bookRepository.search(criteria);

        expect(result.items).toHaveLength(0);
        expect(result.totalCount).toBe(0);
        expect(result.hasNextPage).toBe(false);
        expect(result.nextCursor).toBeNull();
      });

      it('should order by title ascending by default', async () => {
        await createTestBook({
          title: 'Zebra Book',
          authors: [robertMartin],
          type: technicalType,
          categories: [programmingCategory],
        });
        await createTestBook({
          title: 'Alpha Book',
          authors: [martinFowler],
          type: technicalType,
          categories: [programmingCategory],
        });
        await createTestBook({
          title: 'Middle Book',
          authors: [robertMartin],
          type: novelType,
          categories: [softwareCategory],
        });

        const criteria = Criteria.empty();
        const result = await bookRepository.search(criteria);

        expect(result.items.map(i => i.book.title)).toEqual([
          'Alpha Book',
          'Middle Book',
          'Zebra Book',
        ]);
      });
    });

    describe('filter by ISBN (EQUALS)', () => {
      it('should find book by exact ISBN match', async () => {
        await createTestBook({
          title: 'Clean Code',
          authors: [robertMartin],
          type: technicalType,
          categories: [programmingCategory],
          isbn: '9780132350884',
        });
        await createTestBook({
          title: 'Other Book',
          authors: [martinFowler],
          type: technicalType,
          categories: [programmingCategory],
          isbn: '9780596517748',
        });

        const criteria = Criteria.empty().withEquals('isbn', '9780132350884');
        const result = await bookRepository.search(criteria);

        expect(result.items).toHaveLength(1);
        expect(result.items[0].book.title).toBe('Clean Code');
        expect(result.totalCount).toBe(1);
      });

      it('should return empty when ISBN not found', async () => {
        await createTestBook({
          title: 'Some Book',
          authors: [robertMartin],
          type: technicalType,
          categories: [programmingCategory],
          isbn: '9780132350884',
        });

        const criteria = Criteria.empty().withEquals('isbn', '9999999999999');
        const result = await bookRepository.search(criteria);

        expect(result.items).toHaveLength(0);
        expect(result.totalCount).toBe(0);
      });
    });

    describe('filter by title (CONTAINS)', () => {
      it('should find books by partial title match (case-insensitive)', async () => {
        await createTestBook({
          title: 'Clean Code',
          authors: [robertMartin],
          type: technicalType,
          categories: [programmingCategory],
        });
        await createTestBook({
          title: 'The Clean Coder',
          authors: [robertMartin],
          type: technicalType,
          categories: [programmingCategory],
        });
        await createTestBook({
          title: 'Refactoring',
          authors: [martinFowler],
          type: technicalType,
          categories: [programmingCategory],
        });

        const criteria = Criteria.empty().withContains('title', 'clean');
        const result = await bookRepository.search(criteria);

        expect(result.items).toHaveLength(2);
        expect(result.items.map(i => i.book.title).sort()).toEqual([
          'Clean Code',
          'The Clean Coder',
        ]);
        expect(result.totalCount).toBe(2);
      });
    });

    describe('filter by author (CONTAINS)', () => {
      it('should find books by partial author name (case-insensitive)', async () => {
        await createTestBook({
          title: 'Clean Code',
          authors: [robertMartin],
          type: technicalType,
          categories: [programmingCategory],
        });
        await createTestBook({
          title: 'Refactoring',
          authors: [martinFowler],
          type: technicalType,
          categories: [programmingCategory],
        });

        const criteria = Criteria.empty().withContains('author', 'martin');
        const result = await bookRepository.search(criteria);

        // Both books have "Martin" in author name
        expect(result.items).toHaveLength(2);
        expect(result.totalCount).toBe(2);
      });

      it('should find books by specific author', async () => {
        await createTestBook({
          title: 'Clean Code',
          authors: [robertMartin],
          type: technicalType,
          categories: [programmingCategory],
        });
        await createTestBook({
          title: 'Refactoring',
          authors: [martinFowler],
          type: technicalType,
          categories: [programmingCategory],
        });

        const criteria = Criteria.empty().withContains('author', 'fowler');
        const result = await bookRepository.search(criteria);

        expect(result.items).toHaveLength(1);
        expect(result.items[0].book.title).toBe('Refactoring');
      });
    });

    describe('filter by types (IN)', () => {
      it('should find books by single type name (case-insensitive)', async () => {
        await createTestBook({
          title: 'Technical Book',
          authors: [robertMartin],
          type: technicalType,
          categories: [programmingCategory],
        });
        await createTestBook({
          title: 'Novel Book',
          authors: [martinFowler],
          type: novelType,
          categories: [softwareCategory],
        });

        const criteria = Criteria.empty().withIn('type', ['technical']);
        const result = await bookRepository.search(criteria);

        expect(result.items).toHaveLength(1);
        expect(result.items[0].book.title).toBe('Technical Book');
      });

      it('should find books by multiple types (OR logic)', async () => {
        await createTestBook({
          title: 'Technical Book',
          authors: [robertMartin],
          type: technicalType,
          categories: [programmingCategory],
        });
        await createTestBook({
          title: 'Novel Book',
          authors: [martinFowler],
          type: novelType,
          categories: [softwareCategory],
        });

        const criteria = Criteria.empty().withIn('type', ['technical', 'novel']);
        const result = await bookRepository.search(criteria);

        expect(result.items).toHaveLength(2);
        expect(result.totalCount).toBe(2);
      });

      it('should return empty when type not found', async () => {
        await createTestBook({
          title: 'Technical Book',
          authors: [robertMartin],
          type: technicalType,
          categories: [programmingCategory],
        });

        const criteria = Criteria.empty().withIn('type', ['nonexistent']);
        const result = await bookRepository.search(criteria);

        expect(result.items).toHaveLength(0);
        expect(result.totalCount).toBe(0);
      });
    });

    describe('filter by categories (IN)', () => {
      it('should find books by category name (case-insensitive)', async () => {
        await createTestBook({
          title: 'Programming Book',
          authors: [robertMartin],
          type: technicalType,
          categories: [programmingCategory],
        });
        await createTestBook({
          title: 'Software Book',
          authors: [martinFowler],
          type: technicalType,
          categories: [softwareCategory],
        });

        const criteria = Criteria.empty().withIn('categories', ['programming']);
        const result = await bookRepository.search(criteria);

        expect(result.items).toHaveLength(1);
        expect(result.items[0].book.title).toBe('Programming Book');
      });

      it('should find books with multiple categories (OR logic)', async () => {
        await createTestBook({
          title: 'Programming Book',
          authors: [robertMartin],
          type: technicalType,
          categories: [programmingCategory],
        });
        await createTestBook({
          title: 'Software Book',
          authors: [martinFowler],
          type: technicalType,
          categories: [softwareCategory],
        });

        const criteria = Criteria.empty().withIn('categories', ['programming', 'Software Engineering']);
        const result = await bookRepository.search(criteria);

        expect(result.items).toHaveLength(2);
      });
    });

    describe('filter by levels (IN)', () => {
      it('should find books by level name (case-insensitive)', async () => {
        await createTestBook({
          title: 'Beginner Book',
          authors: [robertMartin],
          type: technicalType,
          categories: [programmingCategory],
          levelId: beginnerLevel.id,
        });
        await createTestBook({
          title: 'Advanced Book',
          authors: [martinFowler],
          type: technicalType,
          categories: [programmingCategory],
          levelId: advancedLevel.id,
        });

        const criteria = Criteria.empty().withIn('levels', ['beginner']);
        const result = await bookRepository.search(criteria);

        expect(result.items).toHaveLength(1);
        expect(result.items[0].book.title).toBe('Beginner Book');
      });

      it('should find books with multiple levels (OR logic)', async () => {
        await createTestBook({
          title: 'Beginner Book',
          authors: [robertMartin],
          type: technicalType,
          categories: [programmingCategory],
          levelId: beginnerLevel.id,
        });
        await createTestBook({
          title: 'Advanced Book',
          authors: [martinFowler],
          type: technicalType,
          categories: [programmingCategory],
          levelId: advancedLevel.id,
        });
        await createTestBook({
          title: 'No Level Book',
          authors: [robertMartin],
          type: novelType,
          categories: [softwareCategory],
        });

        const criteria = Criteria.empty().withIn('levels', ['beginner', 'advanced']);
        const result = await bookRepository.search(criteria);

        expect(result.items).toHaveLength(2);
        expect(result.totalCount).toBe(2);
      });
    });

    describe('combined filters (AND logic)', () => {
      it('should combine type and author filters', async () => {
        await createTestBook({
          title: 'Technical by Martin',
          authors: [robertMartin],
          type: technicalType,
          categories: [programmingCategory],
        });
        await createTestBook({
          title: 'Novel by Martin',
          authors: [robertMartin],
          type: novelType,
          categories: [softwareCategory],
        });
        await createTestBook({
          title: 'Technical by Fowler',
          authors: [martinFowler],
          type: technicalType,
          categories: [programmingCategory],
        });

        const criteria = Criteria.empty()
          .withIn('type', ['technical'])
          .withContains('author', 'robert');
        const result = await bookRepository.search(criteria);

        expect(result.items).toHaveLength(1);
        expect(result.items[0].book.title).toBe('Technical by Martin');
      });

      it('should combine title and category filters', async () => {
        await createTestBook({
          title: 'Clean Code',
          authors: [robertMartin],
          type: technicalType,
          categories: [programmingCategory],
        });
        await createTestBook({
          title: 'Clean Architecture',
          authors: [robertMartin],
          type: technicalType,
          categories: [softwareCategory],
        });
        await createTestBook({
          title: 'Refactoring',
          authors: [martinFowler],
          type: technicalType,
          categories: [programmingCategory],
        });

        const criteria = Criteria.empty()
          .withContains('title', 'clean')
          .withIn('categories', ['programming']);
        const result = await bookRepository.search(criteria);

        expect(result.items).toHaveLength(1);
        expect(result.items[0].book.title).toBe('Clean Code');
      });
    });

    describe('pagination', () => {
      it('should respect limit parameter', async () => {
        for (let i = 1; i <= 5; i++) {
          await createTestBook({
            title: `Book ${String(i).padStart(2, '0')}`,
            authors: [robertMartin],
            type: technicalType,
            categories: [programmingCategory],
          });
        }

        const criteria = Criteria.empty().withLimit(2);
        const result = await bookRepository.search(criteria);

        expect(result.items).toHaveLength(2);
        expect(result.totalCount).toBe(5);
        expect(result.hasNextPage).toBe(true);
        expect(result.nextCursor).not.toBeNull();
      });

      it('should paginate using cursor', async () => {
        for (let i = 1; i <= 5; i++) {
          await createTestBook({
            title: `Book ${String(i).padStart(2, '0')}`,
            authors: [robertMartin],
            type: technicalType,
            categories: [programmingCategory],
          });
        }

        // First page
        const firstPage = await bookRepository.search(
          Criteria.empty().withLimit(2)
        );
        expect(firstPage.items).toHaveLength(2);
        expect(firstPage.items.map(i => i.book.title)).toEqual(['Book 01', 'Book 02']);
        expect(firstPage.hasNextPage).toBe(true);

        // Second page using cursor
        const secondPage = await bookRepository.search(
          Criteria.empty().withLimit(2).withCursor(firstPage.nextCursor)
        );
        expect(secondPage.items).toHaveLength(2);
        expect(secondPage.items.map(i => i.book.title)).toEqual(['Book 03', 'Book 04']);
        expect(secondPage.hasNextPage).toBe(true);

        // Third page (last)
        const thirdPage = await bookRepository.search(
          Criteria.empty().withLimit(2).withCursor(secondPage.nextCursor)
        );
        expect(thirdPage.items).toHaveLength(1);
        expect(thirdPage.items.map(i => i.book.title)).toEqual(['Book 05']);
        expect(thirdPage.hasNextPage).toBe(false);
        expect(thirdPage.nextCursor).toBeNull();
      });

      it('should handle pagination with filters', async () => {
        for (let i = 1; i <= 4; i++) {
          await createTestBook({
            title: `Technical Book ${String(i).padStart(2, '0')}`,
            authors: [robertMartin],
            type: technicalType,
            categories: [programmingCategory],
          });
        }
        await createTestBook({
          title: 'Novel Book',
          authors: [martinFowler],
          type: novelType,
          categories: [softwareCategory],
        });

        const criteria = Criteria.empty()
          .withIn('type', ['technical'])
          .withLimit(2);
        const result = await bookRepository.search(criteria);

        expect(result.items).toHaveLength(2);
        expect(result.totalCount).toBe(4); // Only technical books
        expect(result.hasNextPage).toBe(true);
      });
    });

    describe('semantic search with embedding', () => {
      it('should find similar books with similarity score >= 70%', async () => {
        // Create books with specific embeddings
        const baseEmbedding = Array.from({ length: 768 }, () => 0.5);
        
        // Similar embedding (small deviation)
        const similarEmbedding = baseEmbedding.map((v, i) => 
          i < 100 ? v + 0.05 : v
        );
        
        // Dissimilar embedding (large deviation)
        const dissimilarEmbedding = Array.from({ length: 768 }, (_, i) => 
          i % 2 === 0 ? -0.8 : 0.8
        );

        await createTestBook({
          title: 'Similar Book',
          authors: [robertMartin],
          type: technicalType,
          categories: [programmingCategory],
          embedding: similarEmbedding,
        });
        await createTestBook({
          title: 'Dissimilar Book',
          authors: [martinFowler],
          type: technicalType,
          categories: [programmingCategory],
          embedding: dissimilarEmbedding,
        });

        const criteria = Criteria.empty().withSimilarTo('embedding', 'query text');
        const result = await bookRepository.search(criteria, baseEmbedding);

        // Only the similar book should be returned (similarity >= 70%)
        expect(result.items.length).toBeGreaterThanOrEqual(1);
        expect(result.items[0].similarityScore).not.toBeNull();
        expect(result.items[0].similarityScore!).toBeGreaterThanOrEqual(0.7);
      });

      it('should order by similarity score descending when embedding provided', async () => {
        const baseEmbedding = Array.from({ length: 768 }, () => 0.5);
        
        // Create embeddings with different similarities
        const verySimEmbedding = baseEmbedding.map((v, i) => i < 50 ? v + 0.02 : v);
        const lessSimEmbedding = baseEmbedding.map((v, i) => i < 200 ? v + 0.1 : v);

        await createTestBook({
          title: 'Less Similar',
          authors: [robertMartin],
          type: technicalType,
          categories: [programmingCategory],
          embedding: lessSimEmbedding,
        });
        await createTestBook({
          title: 'Very Similar',
          authors: [martinFowler],
          type: technicalType,
          categories: [programmingCategory],
          embedding: verySimEmbedding,
        });

        const criteria = Criteria.empty().withSimilarTo('embedding', 'query');
        const result = await bookRepository.search(criteria, baseEmbedding);

        // Should be ordered by similarity descending
        if (result.items.length >= 2) {
          expect(result.items[0].similarityScore!).toBeGreaterThanOrEqual(
            result.items[1].similarityScore!
          );
        }
      });

      it('should return null similarity score when no embedding provided', async () => {
        await createTestBook({
          title: 'Any Book',
          authors: [robertMartin],
          type: technicalType,
          categories: [programmingCategory],
        });

        const criteria = Criteria.empty();
        const result = await bookRepository.search(criteria);

        expect(result.items[0].similarityScore).toBeNull();
      });

      it('should combine semantic search with other filters', async () => {
        const baseEmbedding = Array.from({ length: 768 }, () => 0.5);
        const similarEmbedding = baseEmbedding.map((v, i) => i < 50 ? v + 0.02 : v);

        await createTestBook({
          title: 'Technical Similar',
          authors: [robertMartin],
          type: technicalType,
          categories: [programmingCategory],
          embedding: similarEmbedding,
        });
        await createTestBook({
          title: 'Novel Similar',
          authors: [martinFowler],
          type: novelType,
          categories: [softwareCategory],
          embedding: similarEmbedding,
        });

        const criteria = Criteria.empty()
          .withSimilarTo('embedding', 'query')
          .withIn('type', ['technical']);
        const result = await bookRepository.search(criteria, baseEmbedding);

        // Should only return technical book
        const technicalBooks = result.items.filter(i => 
          i.book.type.name === 'technical'
        );
        expect(technicalBooks.length).toBe(result.items.length);
      });
    });

    describe('ordering', () => {
      it('should support custom ordering by title ascending', async () => {
        await createTestBook({
          title: 'Zebra',
          authors: [robertMartin],
          type: technicalType,
          categories: [programmingCategory],
        });
        await createTestBook({
          title: 'Alpha',
          authors: [martinFowler],
          type: technicalType,
          categories: [programmingCategory],
        });

        const criteria = Criteria.empty().withOrder(Order.asc('title'));
        const result = await bookRepository.search(criteria);

        expect(result.items.map(i => i.book.title)).toEqual(['Alpha', 'Zebra']);
      });

      it('should support ordering by title descending', async () => {
        await createTestBook({
          title: 'Alpha',
          authors: [robertMartin],
          type: technicalType,
          categories: [programmingCategory],
        });
        await createTestBook({
          title: 'Zebra',
          authors: [martinFowler],
          type: technicalType,
          categories: [programmingCategory],
        });

        const criteria = Criteria.empty().withOrder(Order.desc('title'));
        const result = await bookRepository.search(criteria);

        expect(result.items.map(i => i.book.title)).toEqual(['Zebra', 'Alpha']);
      });
    });
  });
});
