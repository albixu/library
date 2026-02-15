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
import { Book } from '../../../../src/domain/entities/Book.js';
import { Author } from '../../../../src/domain/entities/Author.js';
import { BookType } from '../../../../src/domain/entities/BookType.js';
import { Category } from '../../../../src/domain/entities/Category.js';
import { DuplicateISBNError, BookNotFoundError } from '../../../../src/domain/errors/DomainErrors.js';
import * as schema from '../../../../src/infrastructure/driven/persistence/drizzle/schema.js';
import { generateUUID } from '../../../../src/shared/utils/uuid.js';

const { Pool } = pg;
const { categories, books, bookCategories, bookAuthors, authors, types } = schema;

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

  // Reusable test categories
  let programmingCategory: Category;
  let softwareCategory: Category;

  // Reusable test authors
  let robertMartin: Author;
  let martinFowler: Author;

  // Reusable test book types
  let technicalType: BookType;
  let novelType: BookType;

  beforeAll(async () => {
    const databaseUrl = process.env['DATABASE_URL'] ?? 'postgresql://library:library@localhost:5432/library';
    
    pool = new Pool({
      connectionString: databaseUrl,
      max: 5,
    });

    const client = await pool.connect();
    client.release();

    db = drizzle(pool, { schema });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bookRepository = new PostgresBookRepository(db as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    categoryRepository = new PostgresCategoryRepository(db as any);
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
    // Note: types table has seed data, don't delete it

    // Create reusable test categories
    programmingCategory = await categoryRepository.save(
      Category.create({ id: generateUUID(), name: 'Programming' })
    );
    softwareCategory = await categoryRepository.save(
      Category.create({ id: generateUUID(), name: 'Software Engineering' })
    );

    // Insert test authors into DB
    robertMartin = Author.create({ id: generateUUID(), name: 'Robert C. Martin' });
    martinFowler = Author.create({ id: generateUUID(), name: 'Martin Fowler' });
    
    await db.insert(authors).values([
      { id: robertMartin.id, name: robertMartin.name },
      { id: martinFowler.id, name: martinFowler.name },
    ]);

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
  });

  describe('save', () => {
    it('should save a book with embedding, authors, and categories', async () => {
      const book = Book.create({
        id: generateUUID(),
        title: 'Clean Code',
        authors: [robertMartin],
        description: 'A handbook of agile software craftsmanship',
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
    });

    it('should save a book without ISBN', async () => {
      const unknownAuthor = Author.create({ id: generateUUID(), name: 'Unknown Author' });
      await db.insert(authors).values({ id: unknownAuthor.id, name: unknownAuthor.name });

      const book = Book.create({
        id: generateUUID(),
        title: 'No ISBN Book',
        authors: [unknownAuthor],
        description: 'A book without ISBN',
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
        type: technicalType,
        format: 'pdf',
        categories: [programmingCategory],
      });

      const book2 = Book.create({
        id: generateUUID(),
        title: 'Book Two',
        authors: [authorTwo],
        description: 'Desc two',
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

    it('should return empty array and count 0 when no books exist', async () => {
      const allBooks = await bookRepository.findAll();
      expect(allBooks).toEqual([]);

      const count = await bookRepository.count();
      expect(count).toBe(0);
    });
  });
});
