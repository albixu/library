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
import { DuplicateISBNError, DuplicateBookError, BookNotFoundError } from '../../../../src/domain/errors/DomainErrors.js';
import * as schema from '../../../../src/infrastructure/driven/persistence/drizzle/schema.js';
import { generateUUID } from '../../../../src/shared/utils/uuid.js';

const { Pool } = pg;
const { categories, books, bookCategories } = schema;

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
    // Clean up test data
    await db.delete(bookCategories);
    await db.delete(books);
    await db.delete(categories);

    // Create reusable test categories
    programmingCategory = await categoryRepository.save(
      Category.create({ id: generateUUID(), name: 'Programming' })
    );
    softwareCategory = await categoryRepository.save(
      Category.create({ id: generateUUID(), name: 'Software Engineering' })
    );

    // Create reusable test authors (in-memory only, no authors table yet)
    robertMartin = Author.create({ id: generateUUID(), name: 'Robert C. Martin' });
    martinFowler = Author.create({ id: generateUUID(), name: 'Martin Fowler' });

    // Create reusable test book types (in-memory only, no types table yet)
    technicalType = BookType.create({ id: generateUUID(), name: 'technical' });
    novelType = BookType.create({ id: generateUUID(), name: 'novel' });
  });

  describe('save', () => {
    it('should save a book with embedding and categories', async () => {
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
      expect(saved.categories).toHaveLength(2);
      expect(saved.isbn?.value).toBe('9780132350884');
    });

    it('should save a book without ISBN', async () => {
      const unknownAuthor = Author.create({ id: generateUUID(), name: 'Unknown Author' });
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

    it('should throw DuplicateBookError for duplicate triad (author+title+format)', async () => {
      const sameAuthor = Author.create({ id: generateUUID(), name: 'Same Author' });
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

      // Different Author instance but same normalized name
      const sameAuthorDiffCase = Author.create({ id: generateUUID(), name: 'SAME AUTHOR' });
      const book2 = Book.create({
        id: generateUUID(),
        title: 'same title', // Same title, different case
        authors: [sameAuthorDiffCase],
        description: 'Different description',
        type: novelType,
        format: 'pdf', // Same format
        categories: [softwareCategory],
      });

      await expect(
        bookRepository.save({ book: book2, embedding: generateTestEmbedding() })
      ).rejects.toThrow(DuplicateBookError);
    });
  });

  describe('findById', () => {
    it('should find an existing book with categories', async () => {
      const testAuthor = Author.create({ id: generateUUID(), name: 'Test Author' });
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
        author: 'different author',
        title: 'different title',
        format: 'epub',
      });

      expect(result.isDuplicate).toBe(true);
      expect(result.duplicateType).toBe('isbn');
    });

    it('should detect triad duplicate', async () => {
      const triadAuthor = Author.create({ id: generateUUID(), name: 'Triad Author' });
      const book = Book.create({
        id: generateUUID(),
        title: 'Triad Book',
        authors: [triadAuthor],
        description: 'Description',
        type: technicalType,
        format: 'pdf',
        categories: [programmingCategory],
      });

      await bookRepository.save({ book, embedding: generateTestEmbedding() });

      const result = await bookRepository.checkDuplicate({
        author: 'triad author', // Same normalized
        title: 'triad book', // Same normalized
        format: 'pdf', // Same format
      });

      expect(result.isDuplicate).toBe(true);
      expect(result.duplicateType).toBe('triad');
    });

    it('should return isDuplicate false when no duplicate exists', async () => {
      const result = await bookRepository.checkDuplicate({
        isbn: '9780132350884',
        author: 'unique author',
        title: 'unique title',
        format: 'pdf',
      });

      expect(result.isDuplicate).toBe(false);
    });
  });

  describe('update', () => {
    it('should update mutable fields (available, path)', async () => {
      const updateAuthor = Author.create({ id: generateUUID(), name: 'Update Author' });
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
      const book1 = Book.create({
        id: generateUUID(),
        title: 'Book One',
        authors: [authorOne],
        description: 'Desc one',
        type: technicalType,
        format: 'pdf',
        categories: [programmingCategory],
      });

      const authorTwo = Author.create({ id: generateUUID(), name: 'Author Two' });
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
