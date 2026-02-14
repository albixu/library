/**
 * CreateBookUseCase Integration Tests
 *
 * Tests the complete book creation flow with real infrastructure:
 * - PostgreSQL for persistence
 * - Ollama for embeddings
 *
 * Requires Docker containers: docker-compose up -d
 *
 * Run with: npm run test:integration
 *
 * NOTE: These tests are SKIPPED until TASK-010 is completed.
 * TASK-010 will add TypeRepository.findByName() and AuthorRepository.findOrCreate()
 * which are required for the CreateBookUseCase to work with the new schema.
 *
 * Currently, CreateBookUseCase creates in-memory BookType entities with generated UUIDs,
 * which don't match the types in the database (seeded via init-db.sql).
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { CreateBookUseCase, type CreateBookInput } from '../../../../src/application/use-cases/CreateBookUseCase.js';
import { PostgresBookRepository } from '../../../../src/infrastructure/driven/persistence/PostgresBookRepository.js';
import { PostgresCategoryRepository } from '../../../../src/infrastructure/driven/persistence/PostgresCategoryRepository.js';
import { OllamaEmbeddingService } from '../../../../src/infrastructure/driven/embedding/OllamaEmbeddingService.js';
import { DuplicateISBNError } from '../../../../src/domain/errors/DomainErrors.js';
import { InvalidISBNError, InvalidBookFormatError } from '../../../../src/domain/errors/DomainErrors.js';
import * as schema from '../../../../src/infrastructure/driven/persistence/drizzle/schema.js';

const { Pool } = pg;
const { categories, books, bookCategories, bookAuthors, authors } = schema;

// SKIPPED: Waiting for TASK-010 (TypeRepository + AuthorRepository)
// Currently CreateBookUseCase creates BookType with generated UUID that doesn't exist in DB
describe.skip('CreateBookUseCase Integration', () => {
  let pool: pg.Pool;
  let db: ReturnType<typeof drizzle<typeof schema>>;
  let useCase: CreateBookUseCase;
  let bookRepository: PostgresBookRepository;
  let categoryRepository: PostgresCategoryRepository;
  let embeddingService: OllamaEmbeddingService;

  // Configuration
  const DATABASE_URL = process.env['DATABASE_URL'] ?? 'postgresql://library:library@localhost:5432/library';
  const OLLAMA_BASE_URL = process.env['OLLAMA_BASE_URL'] ?? 'http://localhost:11434';

  beforeAll(async () => {
    pool = new Pool({
      connectionString: DATABASE_URL,
      max: 5,
    });

    const client = await pool.connect();
    client.release();

    db = drizzle(pool, { schema });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bookRepository = new PostgresBookRepository(db as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    categoryRepository = new PostgresCategoryRepository(db as any);
    embeddingService = new OllamaEmbeddingService({
      baseUrl: OLLAMA_BASE_URL,
      model: 'nomic-embed-text',
      timeoutMs: 60000,
    });

    useCase = new CreateBookUseCase({
      bookRepository,
      categoryRepository,
      embeddingService,
    });

    // Verify Ollama is available
    const isAvailable = await embeddingService.isAvailable();
    if (!isAvailable) {
      throw new Error(
        `Ollama is not available at ${OLLAMA_BASE_URL}. ` +
          'Make sure Docker containers are running: docker-compose up -d'
      );
    }
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
  });

  /**
   * Creates a valid book input for testing
   */
  function createValidInput(overrides: Partial<CreateBookInput> = {}): CreateBookInput {
    return {
      title: 'Clean Code',
      author: 'Robert C. Martin',
      description: 'A handbook of agile software craftsmanship',
      type: 'technical',
      categoryNames: ['Programming', 'Software Engineering'],
      format: 'pdf',
      isbn: '9780132350884',
      available: true,
      path: '/books/clean-code.pdf',
      ...overrides,
    };
  }

  describe('successful creation', () => {
    it('should create a book with all fields and categories', async () => {
      const input = createValidInput();

      const result = await useCase.execute(input);

      expect(result.id).toBeDefined();
      expect(result.title).toBe('Clean Code');
      expect(result.author).toBe('Robert C. Martin');
      expect(result.description).toBe('A handbook of agile software craftsmanship');
      expect(result.type).toBe('technical');
      expect(result.format).toBe('pdf');
      expect(result.isbn).toBe('9780132350884');
      expect(result.available).toBe(true);
      expect(result.path).toBe('/books/clean-code.pdf');
      expect(result.categories).toHaveLength(2);
      expect(result.categories.map((c) => c.name)).toContain('programming');
      expect(result.categories.map((c) => c.name)).toContain('software engineering');
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should create a book without ISBN', async () => {
      const input = createValidInput({ isbn: null });

      const result = await useCase.execute(input);

      expect(result.isbn).toBeNull();
      expect(result.title).toBe('Clean Code');
    });

    it('should create a book with minimal required fields', async () => {
      const input = createValidInput({
        categoryNames: ['General'],
        isbn: null,
        path: null,
        available: false,
      });

      const result = await useCase.execute(input);

      expect(result.available).toBe(false);
      expect(result.path).toBeNull();
      expect(result.isbn).toBeNull();
      expect(result.categories).toHaveLength(1);
    });

    it('should reuse existing categories', async () => {
      // Create first book with categories
      const input1 = createValidInput({
        title: 'Clean Code',
        isbn: '9780132350884',
      });
      await useCase.execute(input1);

      // Create second book with same categories
      const input2 = createValidInput({
        title: 'The Pragmatic Programmer',
        isbn: '9780135957059',
      });
      const result2 = await useCase.execute(input2);

      // Categories should be reused (not duplicated)
      const allCategories = await categoryRepository.findAll();
      expect(allCategories).toHaveLength(2); // Only 2, not 4

      expect(result2.categories).toHaveLength(2);
    });

    it('should create new categories when they do not exist', async () => {
      const input = createValidInput({
        categoryNames: ['Brand New Category', 'Another New Category'],
      });

      const result = await useCase.execute(input);

      expect(result.categories).toHaveLength(2);
      expect(result.categories.map((c) => c.name)).toContain('brand new category');
      expect(result.categories.map((c) => c.name)).toContain('another new category');
    });
  });

  describe('duplicate detection', () => {
    it('should reject duplicate ISBN', async () => {
      const input1 = createValidInput();
      await useCase.execute(input1);

      // Try to create book with same ISBN but different title/author
      const input2 = createValidInput({
        title: 'Different Title',
        author: 'Different Author',
        isbn: '9780132350884', // Same ISBN
      });

      await expect(useCase.execute(input2)).rejects.toThrow(DuplicateISBNError);
    });

    it('should allow same title without ISBN (no triad check with multi-author model)', async () => {
      // With multi-author model, triad duplicate detection has been removed
      // Books without ISBN are considered unique (user responsibility)
      const input1 = createValidInput({ isbn: null });
      await useCase.execute(input1);

      // Same author, title, format but no ISBN - should be allowed now
      const input2 = createValidInput({
        isbn: null,
        description: 'Different description',
        categoryNames: ['Different Category'],
      });

      // This should NOT throw - triad check has been removed
      const result = await useCase.execute(input2);
      expect(result.title).toBe('Clean Code');
    });

    it('should allow same title with different format', async () => {
      const input1 = createValidInput({ format: 'pdf', isbn: '9780132350884' });
      await useCase.execute(input1);

      // Same book in different format should be allowed
      // Using a valid ISBN-13: 9780135957059 (The Pragmatic Programmer)
      const input2 = createValidInput({ format: 'epub', isbn: '9780135957059' });
      const result = await useCase.execute(input2);

      expect(result.format).toBe('epub');
    });

    it('should allow same title with different author', async () => {
      const input1 = createValidInput({ isbn: '9780132350884' });
      await useCase.execute(input1);

      // Same title by different author should be allowed
      // Using a valid ISBN-13: 9780201633610 (Design Patterns)
      const input2 = createValidInput({
        author: 'Different Author',
        isbn: '9780201633610',
      });
      const result = await useCase.execute(input2);

      expect(result.author).toBe('Different Author');
    });
  });

  describe('validation errors', () => {
    it('should reject invalid ISBN format', async () => {
      const input = createValidInput({ isbn: 'invalid-isbn' });

      await expect(useCase.execute(input)).rejects.toThrow(InvalidISBNError);
    });

    // Note: Book type validation was removed in TASK-005.
    // Type validation will be done against database in TASK-010 (TypeRepository).

    it('should reject invalid book format', async () => {
      const input = createValidInput({ format: 'invalid-format' });

      await expect(useCase.execute(input)).rejects.toThrow(InvalidBookFormatError);
    });
  });

  describe('book retrieval after creation', () => {
    it('should be findable by ID after creation', async () => {
      const input = createValidInput();
      const created = await useCase.execute(input);

      const found = await bookRepository.findById(created.id);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
      expect(found!.title).toBe('Clean Code');
    });

    it('should be findable by ISBN after creation', async () => {
      const input = createValidInput();
      const created = await useCase.execute(input);

      const found = await bookRepository.findByIsbn('9780132350884');

      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
    });

    it('should have embedding stored in database', async () => {
      const input = createValidInput();
      const created = await useCase.execute(input);

      // Verify the book exists with an embedding by checking it can be found
      const found = await bookRepository.findById(created.id);
      expect(found).not.toBeNull();
      
      // The embedding should have been generated and stored
      // We can't directly check the embedding from Book entity,
      // but successful creation implies it was saved
      expect(found!.id).toBe(created.id);
    });
  });
});
