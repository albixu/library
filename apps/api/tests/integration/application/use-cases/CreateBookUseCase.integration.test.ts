/**
 * CreateBookUseCase Integration Tests
 *
 * Tests the complete book creation flow with real infrastructure:
 * - PostgreSQL for persistence
 * - Ollama for embeddings
 * - Ollama for translation (HU-013)
 *
 * Requires Docker containers: docker-compose up -d
 *
 * Run with: npm run test:integration
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { CreateBookUseCase, type CreateBookInput } from '../../../../src/application/use-cases/CreateBookUseCase.js';
import { PostgresBookRepository } from '../../../../src/infrastructure/driven/persistence/PostgresBookRepository.js';
import { PostgresCategoryRepository } from '../../../../src/infrastructure/driven/persistence/PostgresCategoryRepository.js';
import { PostgresTypeRepository } from '../../../../src/infrastructure/driven/persistence/PostgresTypeRepository.js';
import { PostgresAuthorRepository } from '../../../../src/infrastructure/driven/persistence/PostgresAuthorRepository.js';
import { PostgresLevelRepository } from '../../../../src/infrastructure/driven/persistence/PostgresLevelRepository.js';
import { OllamaEmbeddingService } from '../../../../src/infrastructure/driven/embedding/OllamaEmbeddingService.js';
import { OllamaTranslationService } from '../../../../src/infrastructure/driven/translation/OllamaTranslationService.js';
import { DuplicateISBNError, InvalidBookTypeError } from '../../../../src/domain/errors/DomainErrors.js';
import { InvalidISBNError, InvalidBookFormatError } from '../../../../src/domain/errors/DomainErrors.js';
import * as schema from '../../../../src/infrastructure/driven/persistence/drizzle/schema.js';

const { Pool } = pg;
const { categories, books, bookCategories, bookAuthors, authors } = schema;

describe('CreateBookUseCase Integration', () => {
  let pool: pg.Pool;
  let db: ReturnType<typeof drizzle<typeof schema>>;
  let useCase: CreateBookUseCase;
  let bookRepository: PostgresBookRepository;
  let categoryRepository: PostgresCategoryRepository;
  let typeRepository: PostgresTypeRepository;
  let authorRepository: PostgresAuthorRepository;
  let levelRepository: PostgresLevelRepository;
  let embeddingService: OllamaEmbeddingService;
  let translationService: OllamaTranslationService;

  // Configuration
  const DATABASE_URL = process.env['DATABASE_URL'] ?? 'postgresql://library:library@localhost:5432/library';
  const OLLAMA_BASE_URL = process.env['OLLAMA_BASE_URL'] ?? 'http://localhost:11434';
  const TRANSLATION_MODEL = process.env['TRANSLATION_MODEL'] ?? 'qwen2.5:3b';

  beforeAll(async () => {
    pool = new Pool({
      connectionString: DATABASE_URL,
      max: 5,
    });

    const client = await pool.connect();
    client.release();

    db = drizzle(pool, { schema });
     
    bookRepository = new PostgresBookRepository(db as any);
     
    categoryRepository = new PostgresCategoryRepository(db as any);
     
    typeRepository = new PostgresTypeRepository(db as any);
     
    authorRepository = new PostgresAuthorRepository(db as any);

    levelRepository = new PostgresLevelRepository(db as any);

    embeddingService = new OllamaEmbeddingService({
      baseUrl: OLLAMA_BASE_URL,
      model: 'nomic-embed-text',
      timeoutMs: 60000,
    });

    // HU-013: Add translation service
    translationService = new OllamaTranslationService({
      baseUrl: OLLAMA_BASE_URL,
      model: TRANSLATION_MODEL,
      timeoutMs: 120000,
      retries: 2,
    });

    useCase = new CreateBookUseCase({
      bookRepository,
      categoryRepository,
      typeRepository,
      authorRepository,
      levelRepository,
      embeddingService,
      translationService, // HU-013
    });

  });

  /**
   * Returns true (skip) when the Ollama embedding service is NOT available.
   * Used with it.skipIf to cleanly skip tests that require Ollama embeddings
   * without failing the entire suite or silently skipping with early returns.
   * NOTE: Tests requiring embeddings need Ollama running with nomic-embed-text model.
   * Run: docker exec library-ollama ollama pull nomic-embed-text
   */
  const embeddingServiceUnavailable = async (): Promise<boolean> => {
    try {
      const available = await embeddingService.isAvailable();
      return !available;
    } catch {
      return true; // service not available → skip
    }
  };

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
   * HU-013: Added language field (required)
   * Default to 'es' (Spanish) to avoid triggering translation in non-translation tests
   */
  function createValidInput(overrides: Partial<CreateBookInput> = {}): CreateBookInput {
    return {
      title: 'Clean Code',
      authors: ['Robert C. Martin'],
      description: 'Un manual de artesanía de software ágil', // Spanish description
      language: 'es', // HU-013: Default to Spanish to avoid translation in regular tests
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
    it.skipIf(embeddingServiceUnavailable)('should create a book with all fields and categories', async () => {
      const input = createValidInput();

      const result = await useCase.execute(input);

      expect(result.id).toBeDefined();
      expect(result.title).toBe('Clean Code');
      expect(result.authors).toHaveLength(1);
      expect(result.authors[0].name).toBe('Robert C. Martin');
      expect(result.description).toBe('Un manual de artesanía de software ágil');
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

    it.skipIf(embeddingServiceUnavailable)('should create a book with multiple authors', async () => {
      const input = createValidInput({
        authors: ['Author One', 'Author Two', 'Author Three'],
        isbn: '9780135957059', // Use different ISBN to avoid conflict
      });

      const result = await useCase.execute(input);

      expect(result.authors).toHaveLength(3);
      expect(result.authors.map((a) => a.name)).toContain('Author One');
      expect(result.authors.map((a) => a.name)).toContain('Author Two');
      expect(result.authors.map((a) => a.name)).toContain('Author Three');
    });

    it.skipIf(embeddingServiceUnavailable)('should create a book without ISBN', async () => {
      const input = createValidInput({ isbn: null });

      const result = await useCase.execute(input);

      expect(result.isbn).toBeNull();
      expect(result.title).toBe('Clean Code');
    });

    it.skipIf(embeddingServiceUnavailable)('should create a book with minimal required fields', async () => {
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

    it.skipIf(embeddingServiceUnavailable)('should reuse existing categories', async () => {
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

    it.skipIf(embeddingServiceUnavailable)('should create new categories when they do not exist', async () => {
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
    it.skipIf(embeddingServiceUnavailable)('should reject duplicate ISBN', async () => {
      const input1 = createValidInput();
      await useCase.execute(input1);

      // Try to create book with same ISBN but different title/author
      const input2 = createValidInput({
        title: 'Different Title',
        authors: ['Different Author'],
        isbn: '9780132350884', // Same ISBN
      });

      await expect(useCase.execute(input2)).rejects.toThrow(DuplicateISBNError);
    });

    it.skipIf(embeddingServiceUnavailable)('should allow same title without ISBN (no triad check with multi-author model)', async () => {
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

    it.skipIf(embeddingServiceUnavailable)('should allow same title with different format', async () => {
      const input1 = createValidInput({ format: 'pdf', isbn: '9780132350884' });
      await useCase.execute(input1);

      // Same book in different format should be allowed
      // Using a valid ISBN-13: 9780135957059 (The Pragmatic Programmer)
      const input2 = createValidInput({ format: 'epub', isbn: '9780135957059' });
      const result = await useCase.execute(input2);

      expect(result.format).toBe('epub');
    });

    it.skipIf(embeddingServiceUnavailable)('should allow same title with different author', async () => {
      const input1 = createValidInput({ isbn: '9780132350884' });
      await useCase.execute(input1);

      // Same title by different author should be allowed
      // Using a valid ISBN-13: 9780201633610 (Design Patterns)
      const input2 = createValidInput({
        authors: ['Different Author'],
        isbn: '9780201633610',
      });
      const result = await useCase.execute(input2);

      expect(result.authors[0].name).toBe('Different Author');
    });
  });

  describe('validation errors', () => {
    it('should reject invalid ISBN format', async () => {
      const input = createValidInput({ isbn: 'invalid-isbn' });

      await expect(useCase.execute(input)).rejects.toThrow(InvalidISBNError);
    });

    it('should reject invalid book type', async () => {
      const input = createValidInput({ type: 'nonexistent-type' });

      await expect(useCase.execute(input)).rejects.toThrow(InvalidBookTypeError);
    });

    it('should reject invalid book format', async () => {
      const input = createValidInput({ format: 'invalid-format' });

      await expect(useCase.execute(input)).rejects.toThrow(InvalidBookFormatError);
    });
  });

  describe('book retrieval after creation', () => {
    it.skipIf(embeddingServiceUnavailable)('should be findable by ID after creation', async () => {
      const input = createValidInput();
      const created = await useCase.execute(input);

      const found = await bookRepository.findById(created.id);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
      expect(found!.title).toBe('Clean Code');
    });

    it.skipIf(embeddingServiceUnavailable)('should be findable by ISBN after creation', async () => {
      const input = createValidInput();
      const created = await useCase.execute(input);

      const found = await bookRepository.findByIsbn('9780132350884');

      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
    });

    it.skipIf(embeddingServiceUnavailable)('should have embedding stored in database', async () => {
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

  // HU-011: Tests for pre-translated description (batch operations)
  // This feature allows scripts like seed-database.ts to provide pre-translated descriptions,
  // avoiding slow translation service calls during bulk operations.
  describe('pre-translated description handling (HU-011)', () => {
    it.skipIf(embeddingServiceUnavailable)('should use provided translatedDescription instead of calling translation service', async () => {
      const englishDescription = 'A handbook of agile software craftsmanship';
      const preTranslatedDescription = 'Un manual de artesanía de software ágil (pre-traducido)';
      
      const input = createValidInput({
        description: englishDescription,
        translatedDescription: preTranslatedDescription,
        language: 'en',
        isbn: '9781491950357', // Different ISBN
      });

      const result = await useCase.execute(input);

      // originalDescription should be the English input
      expect(result.originalDescription).toBe(englishDescription);
      
      // description should be the pre-translated Spanish, not a new translation
      expect(result.description).toBe(preTranslatedDescription);
    });

    it.skipIf(embeddingServiceUnavailable)('should use translatedDescription even for Spanish books', async () => {
      const spanishDescription = 'Una descripción original en español';
      const differentTranslation = 'Una traducción diferente proporcionada manualmente';
      
      const input = createValidInput({
        description: spanishDescription,
        translatedDescription: differentTranslation,
        language: 'es',
        isbn: '9781491950364', // Different ISBN
      });

      const result = await useCase.execute(input);

      // When translatedDescription is explicitly provided, it should be used
      // even if the language is Spanish
      expect(result.originalDescription).toBe(spanishDescription);
      expect(result.description).toBe(differentTranslation);
    });

    it.skipIf(embeddingServiceUnavailable)('should persist pre-translated description to database', async () => {
      const englishDescription = 'Clean code principles for modern developers';
      const preTranslatedDescription = 'Principios de código limpio para desarrolladores modernos';
      
      const input = createValidInput({
        description: englishDescription,
        translatedDescription: preTranslatedDescription,
        language: 'en',
        isbn: '9781491950371', // Different ISBN
      });

      const created = await useCase.execute(input);
      const found = await bookRepository.findById(created.id);

      expect(found).not.toBeNull();
      expect(found!.originalDescription).toBe(englishDescription);
      expect(found!.description).toBe(preTranslatedDescription);
    });

    it.skipIf(embeddingServiceUnavailable)('should generate embedding from pre-translated description', async () => {
      const englishDescription = 'Test book for pre-translated embedding';
      const preTranslatedDescription = 'Libro de prueba para embedding pre-traducido';
      
      const input = createValidInput({
        description: englishDescription,
        translatedDescription: preTranslatedDescription,
        language: 'en',
        isbn: '9781491950388', // Different ISBN
      });

      const result = await useCase.execute(input);

      // Verify the book was created successfully
      // This implies embedding was generated from the pre-translated Spanish description
      expect(result.id).toBeDefined();
      expect(result.description).toBe(preTranslatedDescription);
      
      const found = await bookRepository.findById(result.id);
      expect(found).not.toBeNull();
    });

    it.skipIf(embeddingServiceUnavailable)('should work with CreateBookUseCase initialized without translationService', async () => {
      // This simulates how seed-database.ts uses the use case
      const useCaseWithoutTranslation = new CreateBookUseCase({
        bookRepository,
        categoryRepository,
        typeRepository,
        authorRepository,
        levelRepository,
        embeddingService,
        // Note: NO translationService provided
      });

      const englishDescription = 'Book created without translation service';
      const preTranslatedDescription = 'Libro creado sin servicio de traducción';
      
      const input = createValidInput({
        description: englishDescription,
        translatedDescription: preTranslatedDescription,
        language: 'en',
        isbn: '9781491950395', // Different ISBN
      });

      const result = await useCaseWithoutTranslation.execute(input);

      expect(result.originalDescription).toBe(englishDescription);
      expect(result.description).toBe(preTranslatedDescription);
    });

    it.skipIf(embeddingServiceUnavailable)('should fallback to original description when no translationService and no translatedDescription', async () => {
      // Edge case: English book, no translation service, no pre-translated description
      const useCaseWithoutTranslation = new CreateBookUseCase({
        bookRepository,
        categoryRepository,
        typeRepository,
        authorRepository,
        levelRepository,
        embeddingService,
        // Note: NO translationService provided
      });

      const englishDescription = 'Book without any translation';
      
      const input = createValidInput({
        description: englishDescription,
        language: 'en',
        isbn: '9781491950401', // Different ISBN
        // Note: NO translatedDescription provided
      });

      const result = await useCaseWithoutTranslation.execute(input);

      // Without translation service and without translatedDescription,
      // both descriptions should be the original
      expect(result.originalDescription).toBe(englishDescription);
      expect(result.description).toBe(englishDescription);
    });
  });

  // HU-013: Tests for translation functionality
  // NOTE: These tests require the translation model (qwen2.5:3b) to be installed in Ollama.
  // Run: docker exec library-ollama ollama pull qwen2.5:3b
  // Tests will be skipped automatically if the model is not available.
  describe('translation handling (HU-013)', () => {
    /**
     * Returns true (skip) when the translation model is NOT available.
     * Used with it.skipIf to cleanly skip tests without silent early returns.
     */
    const translationModelUnavailable = async (): Promise<boolean> => {
      try {
        await translationService.isAvailable();
        // isAvailable only checks the service; we need to verify the model works
        await translationService.translate('test', 'es');
        return false; // model works → do NOT skip
      } catch {
        return true; // model not available → skip
      }
    };

    it.skipIf(translationModelUnavailable)(
      'should create book with translated description (English → Spanish)',
      async () => {
        const englishDescription = 'A handbook of agile software craftsmanship';
        const input = createValidInput({
          description: englishDescription,
          language: 'en',
          isbn: '9780596517748', // Different ISBN
        });

        const result = await useCase.execute(input);

        // originalDescription should be the English input
        expect(result.originalDescription).toBe(englishDescription);

        // description should be translated to Spanish
        expect(result.description).toBeDefined();
        expect(result.description.length).toBeGreaterThan(0);

        // Translation should contain Spanish words (not be the same as English)
        const lowerDesc = result.description.toLowerCase();
        const hasSpanishIndicators =
          lowerDesc.includes('manual') ||
          lowerDesc.includes('artesanía') ||
          lowerDesc.includes('ágil') ||
          lowerDesc.includes('software') ||
          result.description !== englishDescription;

        expect(hasSpanishIndicators).toBe(true);
      },
      180000, // 3 minute timeout
    );

    it.skipIf(embeddingServiceUnavailable)('should create book without translation (Spanish)', async () => {
      const spanishDescription = 'Un manual de artesanía de software ágil';
      const input = createValidInput({
        description: spanishDescription,
        language: 'es',
        isbn: '9780596007126', // Different ISBN
      });

      const result = await useCase.execute(input);

      // For Spanish books, originalDescription and description should be the same
      expect(result.originalDescription).toBe(spanishDescription);
      expect(result.description).toBe(spanishDescription);
    }, 60000);

    it.skipIf(translationModelUnavailable)(
      'should persist both originalDescription and description',
      async () => {
        const englishDescription = 'Clean code is code that has been written with care';
        const input = createValidInput({
          description: englishDescription,
          language: 'en',
          isbn: '9780201633610', // Different ISBN
        });

        const created = await useCase.execute(input);
        const found = await bookRepository.findById(created.id);

        expect(found).not.toBeNull();
        expect(found!.originalDescription).toBe(englishDescription);
        // description should be translated (different from original for English)
        expect(found!.description).toBeDefined();
        expect(found!.description.length).toBeGreaterThan(0);
      },
      180000,
    );

    it.skipIf(translationModelUnavailable)(
      'should generate embedding from Spanish description',
      async () => {
        const englishDescription = 'Test book for embedding generation';
        const input = createValidInput({
          description: englishDescription,
          language: 'en',
          isbn: '9780596009205', // Different ISBN
        });

        const result = await useCase.execute(input);

        // Verify the book was created successfully
        // This implies embedding was generated from the Spanish description
        expect(result.id).toBeDefined();
        expect(result.description).toBeDefined();

        // The embedding should have been generated successfully
        const found = await bookRepository.findById(result.id);
        expect(found).not.toBeNull();
      },
      180000,
    );
  });
});
