/**
 * E2E Tests: POST /api/books
 *
 * End-to-end tests for the book creation API endpoint.
 * These tests validate the complete flow from HTTP request to database persistence.
 *
 * Tests cover:
 * - Successful book creation (201)
 * - Validation errors (400)
 * - Duplicate ISBN conflict (409)
 * - Embedding service unavailable (503)
 * - Response format verification (no embedding exposed)
 * - HU-013: Translation handling (originalDescription, language fields)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  createE2EContext,
  createTestDb,
  closeTestDb,
  clearTestData,
  E2E_BASE_URL,
  generateUniqueISBN,
  e2eFixtures,
} from '../setup.js';
import { OllamaEmbeddingService } from '../../../src/infrastructure/driven/embedding/OllamaEmbeddingService.js';
import { OllamaTranslationService } from '../../../src/infrastructure/driven/translation/OllamaTranslationService.js';
import { PostgresBookRepository } from '../../../src/infrastructure/driven/persistence/PostgresBookRepository.js';
import { PostgresCategoryRepository } from '../../../src/infrastructure/driven/persistence/PostgresCategoryRepository.js';
import { PostgresTypeRepository } from '../../../src/infrastructure/driven/persistence/PostgresTypeRepository.js';
import { PostgresAuthorRepository } from '../../../src/infrastructure/driven/persistence/PostgresAuthorRepository.js';
import { PostgresLevelRepository } from '../../../src/infrastructure/driven/persistence/PostgresLevelRepository.js';
import { CreateBookUseCase } from '../../../src/application/use-cases/CreateBookUseCase.js';
import { SearchBooksUseCase } from '../../../src/application/use-cases/SearchBooksUseCase.js';
import { ListBookTypesUseCase } from '../../../src/application/use-cases/ListBookTypesUseCase.js';
import { ListCategoriesUseCase } from '../../../src/application/use-cases/ListCategoriesUseCase.js';
import { ListBookLevelsUseCase } from '../../../src/application/use-cases/ListBookLevelsUseCase.js';
import { createServer } from '../../../src/infrastructure/driver/http/server.js';
import { noopLogger } from '../../../src/application/ports/Logger.js';

const OLLAMA_URL = process.env['OLLAMA_BASE_URL'] ?? process.env['OLLAMA_URL'] ?? 'http://ollama:11434';
const TRANSLATION_MODEL = process.env['TRANSLATION_MODEL'] ?? 'llama3.2:1b';

/**
 * Creates a server with a broken service URL to test 503 responses.
 * Returns the server and base URL for requests.
 */
async function createBrokenServiceServer(options: {
  brokenEmbedding?: boolean;
  brokenTranslation?: boolean;
  port: number;
}) {
  const db = await createTestDb();
  await clearTestData(db);

  const invalidUrl = 'http://localhost:19999'; // Non-existent port

  const embeddingService = new OllamaEmbeddingService({
    baseUrl: options.brokenEmbedding ? invalidUrl : OLLAMA_URL,
    model: 'nomic-embed-text',
    timeoutMs: 2000, // Short timeout for faster tests
  });

  const translationService = new OllamaTranslationService({
    baseUrl: options.brokenTranslation ? invalidUrl : OLLAMA_URL,
    model: TRANSLATION_MODEL,
    timeoutMs: 2000,
    retries: 1, // Fewer retries for faster tests
  });

  const bookRepository = new PostgresBookRepository(db as any);
  const categoryRepository = new PostgresCategoryRepository(db as any);
  const typeRepository = new PostgresTypeRepository(db as any);
  const authorRepository = new PostgresAuthorRepository(db as any);
  const levelRepository = new PostgresLevelRepository(db as any);

  const createBookUseCase = new CreateBookUseCase({
    bookRepository,
    categoryRepository,
    typeRepository,
    authorRepository,
    levelRepository,
    embeddingService,
    translationService,
    logger: noopLogger,
  });

  const server = await createServer({
    createBookUseCase,
    searchBooksUseCase: new SearchBooksUseCase({ bookRepository, embeddingService, logger: noopLogger }),
    listBookTypesUseCase: new ListBookTypesUseCase(typeRepository),
    listCategoriesUseCase: new ListCategoriesUseCase(categoryRepository, typeRepository),
    listBookLevelsUseCase: new ListBookLevelsUseCase(levelRepository, typeRepository),
    logger: noopLogger,
  });

  await server.listen({ port: options.port, host: '127.0.0.1' });

  return {
    server,
    db,
    baseUrl: `http://127.0.0.1:${options.port}`,
  };
}

describe('POST /api/books (E2E)', () => {
  const context = createE2EContext();

  beforeAll(async () => {
    await context.setup();
  });

  afterAll(async () => {
    await context.teardown();
  });

  beforeEach(async () => {
    await context.cleanup();
  });

  // SKIPPED: Waiting for TASK-010 (TypeRepository + AuthorRepository)
  // Currently CreateBookUseCase creates BookType with generated UUID that doesn't exist in DB
  describe('Successful Creation', () => {
    it('should create a book and return 201 with book data', async () => {
      const uniqueISBN = generateUniqueISBN();
      const bookData = {
        ...e2eFixtures.validBook,
        isbn: uniqueISBN,
      };

      const response = await fetch(`${E2E_BASE_URL}/api/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookData),
      });

      expect(response.status).toBe(201);

      const body = await response.json();

      // Verify standardized API response structure
      expect(body).toHaveProperty('success', true);
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('error', null);

      const { data } = body;

      // Verify book data structure
      expect(data).toMatchObject({
        id: expect.any(String),
        title: bookData.title,
        description: bookData.description,
        originalDescription: bookData.description, // HU-013: Same as description for Spanish input
        language: bookData.language, // HU-013
        type: bookData.type,
        format: bookData.format,
        isbn: uniqueISBN,
        available: true,
        path: bookData.path,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });

      // Verify authors (new array format with id and name)
      expect(data.authors).toHaveLength(1);
      expect(data.authors[0]).toMatchObject({
        id: expect.any(String),
        name: bookData.authors[0],
      });

      // Verify categories (names are normalized to lowercase by the system)
      expect(data.categories).toHaveLength(1);
      expect(data.categories[0]).toMatchObject({
        id: expect.any(String),
        name: 'e2e testing',
      });

      // Verify UUID format
      expect(data.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );

      // Verify ISO date format
      expect(new Date(data.createdAt).toISOString()).toBe(data.createdAt);
      expect(new Date(data.updatedAt).toISOString()).toBe(data.updatedAt);
    });

    it('should not include embedding in the response', async () => {
      const bookData = {
        ...e2eFixtures.validBook,
        isbn: generateUniqueISBN(),
      };

      const response = await fetch(`${E2E_BASE_URL}/api/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookData),
      });

      expect(response.status).toBe(201);

      const body = await response.json();

      // Verify standardized response structure
      expect(body).toHaveProperty('success', true);
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('error', null);

      // CRITICAL: Embedding should never be exposed in API response
      expect(body.data).not.toHaveProperty('embedding');
      expect(body.data).not.toHaveProperty('embeddings');
    });

    it('should create book without optional fields (isbn, path)', async () => {
      const bookData = {
        title: 'Book Without Optional Fields',
        authors: ['Test Author'],
        description: 'Un libro sin ISBN ni path.',
        type: 'novel',
        format: 'epub',
        categories: ['Fiction'],
        language: 'es', // HU-013: Spanish to avoid translation
      };

      const response = await fetch(`${E2E_BASE_URL}/api/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookData),
      });

      expect(response.status).toBe(201);

      const body = await response.json();

      // Verify standardized response structure
      expect(body).toHaveProperty('success', true);
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('error', null);

      expect(body.data.isbn).toBeNull();
      expect(body.data.path).toBeNull();
      expect(body.data.available).toBe(true); // Default value
    });

    it('should create book with multiple categories', async () => {
      const bookData = {
        title: 'Multi-Category Book',
        authors: ['Test Author'],
        description: 'Un libro con múltiples categorías.',
        type: 'technical',
        format: 'pdf',
        categories: ['Programming', 'Software Engineering', 'Best Practices'],
        language: 'es', // HU-013: Spanish to avoid translation
        isbn: generateUniqueISBN(),
      };

      const response = await fetch(`${E2E_BASE_URL}/api/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookData),
      });

      expect(response.status).toBe(201);

      const body = await response.json();

      // Verify standardized response structure
      expect(body).toHaveProperty('success', true);
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('error', null);

      expect(body.data.categories).toHaveLength(3);
      // Category names are normalized to lowercase by the system
      const categoryNames = body.data.categories.map((c: { name: string }) => c.name.toLowerCase());
      expect(categoryNames).toContain('programming');
      expect(categoryNames).toContain('software engineering');
      expect(categoryNames).toContain('best practices');
    });

    it('should create book with level and return level name in response', async () => {
      const bookData = {
        title: 'Book With Level',
        authors: ['Level Author'],
        description: 'Un libro con un nivel especificado.',
        type: 'technical',
        format: 'pdf',
        categories: ['Programming'],
        language: 'es', // HU-013: Spanish to avoid translation
        isbn: generateUniqueISBN(),
        level: 'Intermediate',
      };

      const response = await fetch(`${E2E_BASE_URL}/api/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookData),
      });

      expect(response.status).toBe(201);

      const body = await response.json();

      // Verify standardized response structure
      expect(body).toHaveProperty('success', true);
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('error', null);

      // HU-008: Level name should be returned in response
      expect(body.data.level).toBe('Intermediate');
    });

    it('should create book without level (null)', async () => {
      const bookData = {
        title: 'Book Without Level',
        authors: ['Test Author'],
        description: 'Un libro sin nivel especificado.',
        type: 'novel', // novels don't typically have levels
        format: 'epub',
        categories: ['Fiction'],
        language: 'es', // HU-013: Spanish to avoid translation
        isbn: generateUniqueISBN(),
      };

      const response = await fetch(`${E2E_BASE_URL}/api/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookData),
      });

      expect(response.status).toBe(201);

      const body = await response.json();

      // Verify standardized response structure
      expect(body).toHaveProperty('success', true);
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('error', null);

      // Level should be null when not provided
      expect(body.data.level).toBeNull();
    });
  });

  describe('Validation Errors (400)', () => {
    it('should return 400 when title is missing', async () => {
      const response = await fetch(`${E2E_BASE_URL}/api/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(e2eFixtures.bookWithoutTitle),
      });

      expect(response.status).toBe(400);

      const body = await response.json();

      // Verify standardized error response structure
      expect(body).toHaveProperty('success', false);
      expect(body).toHaveProperty('data', null);
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('message');

      // Zod errors return "Validation failed" in message and field details in details array
      expect(body.error.message.toLowerCase()).toContain('validation');
      expect(body.error.details).toBeDefined();
      expect(body.error.details.some((d: string) => d.toLowerCase().includes('title'))).toBe(true);
    });

    it('should return 400 when authors is missing', async () => {
      const { authors, ...bookWithoutAuthors } = e2eFixtures.validBook;

      const response = await fetch(`${E2E_BASE_URL}/api/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookWithoutAuthors),
      });

      expect(response.status).toBe(400);

      const body = await response.json();

      // Verify standardized error response structure
      expect(body).toHaveProperty('success', false);
      expect(body).toHaveProperty('data', null);
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('message');
    });

    it('should return 400 when description is missing', async () => {
      const { description, ...bookWithoutDescription } = e2eFixtures.validBook;

      const response = await fetch(`${E2E_BASE_URL}/api/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookWithoutDescription),
      });

      expect(response.status).toBe(400);

      const body = await response.json();

      // Verify standardized error response structure
      expect(body).toHaveProperty('success', false);
      expect(body).toHaveProperty('data', null);
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('message');
    });

    it('should return 400 when categories is empty', async () => {
      const bookData = {
        ...e2eFixtures.validBook,
        categories: [],
      };

      const response = await fetch(`${E2E_BASE_URL}/api/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookData),
      });

      expect(response.status).toBe(400);

      const body = await response.json();

      // Verify standardized error response structure
      expect(body).toHaveProperty('success', false);
      expect(body).toHaveProperty('data', null);
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('message');
    });

    // Note: Type validation removed in TASK-005.
    // Type validation against database now done via TypeRepository (TASK-010).

    it('should return 400 when type is invalid', async () => {
      const bookData = {
        ...e2eFixtures.validBook,
        type: 'nonexistent_type',
      };

      const response = await fetch(`${E2E_BASE_URL}/api/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookData),
      });

      expect(response.status).toBe(400);

      const body = await response.json();

      // Verify standardized error response structure
      expect(body).toHaveProperty('success', false);
      expect(body).toHaveProperty('data', null);
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('message');
    });

    it('should return 400 when format is invalid', async () => {
      const bookData = {
        ...e2eFixtures.validBook,
        format: 'invalid_format',
      };

      const response = await fetch(`${E2E_BASE_URL}/api/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookData),
      });

      expect(response.status).toBe(400);

      const body = await response.json();

      // Verify standardized error response structure
      expect(body).toHaveProperty('success', false);
      expect(body).toHaveProperty('data', null);
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('message');
    });

    it('should return 400 when ISBN format is invalid', async () => {
      const bookData = {
        ...e2eFixtures.validBook,
        isbn: 'invalid-isbn',
      };

      const response = await fetch(`${E2E_BASE_URL}/api/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookData),
      });

      expect(response.status).toBe(400);

      const body = await response.json();

      // Verify standardized error response structure
      expect(body).toHaveProperty('success', false);
      expect(body).toHaveProperty('data', null);
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('message');
    });
  });

  // Tests for ISBN duplicate - triad duplicate detection was removed with multi-author model
  describe('Conflict Errors (409)', () => {
    it('should return 409 when ISBN already exists', async () => {
      const isbn = generateUniqueISBN();
      const bookData = {
        ...e2eFixtures.validBook,
        isbn,
      };

      // Create first book
      const response1 = await fetch(`${E2E_BASE_URL}/api/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookData),
      });
      expect(response1.status).toBe(201);

      // Attempt to create duplicate with same ISBN but different title/authors
      const duplicateBook = {
        ...e2eFixtures.validBook,
        title: 'Different Title',
        authors: ['Different Author'],
        isbn,
      };

      const response2 = await fetch(`${E2E_BASE_URL}/api/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(duplicateBook),
      });

      expect(response2.status).toBe(409);

      const body = await response2.json();

      // Verify standardized error response structure
      expect(body).toHaveProperty('success', false);
      expect(body).toHaveProperty('data', null);
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('message');
      expect(body.error.message.toLowerCase()).toContain('isbn');
    });

    it('should allow same title/authors/format without ISBN (no triad check)', async () => {
      // With multi-author model, triad duplicate detection has been removed
      // Books without ISBN are considered unique (user responsibility)
      const bookData = {
        title: 'Unique Triad Book',
        authors: ['Unique Author'],
        description: 'Primer libro con esta triada.',
        type: 'technical',
        format: 'pdf',
        categories: ['Testing'],
        language: 'es', // HU-013: Spanish to avoid translation
      };

      // Create first book
      const response1 = await fetch(`${E2E_BASE_URL}/api/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookData),
      });
      expect(response1.status).toBe(201);

      // Create second book with same authors/title/format - should succeed now
      const duplicateBook = {
        ...bookData,
        description: 'Segundo libro con la misma triada.',
        categories: ['Other Category'],
      };

      const response2 = await fetch(`${E2E_BASE_URL}/api/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(duplicateBook),
      });

      // Should now succeed (201) instead of conflict (409)
      expect(response2.status).toBe(201);
    });
  });

  /**
   * HU-013: Translation Handling Tests
   *
   * These tests verify that the API correctly handles description translation:
   * - Spanish descriptions are stored as-is (originalDescription === description)
   * - Non-Spanish descriptions require translation service
   * - Response includes originalDescription, description, and language fields
   *
   * NOTE: Tests that require actual translation are skipped when the model is unavailable.
   */
  describe('Translation Handling (HU-013)', () => {
    it('should return originalDescription same as description for Spanish input', async () => {
      const spanishDescription = 'Esta es una descripción en español para el libro de prueba.';
      const bookData = {
        title: 'Libro en Español',
        authors: ['Autor Español'],
        description: spanishDescription,
        type: 'technical',
        format: 'pdf',
        categories: ['Programación'],
        language: 'es',
        isbn: generateUniqueISBN(),
      };

      const response = await fetch(`${E2E_BASE_URL}/api/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookData),
      });

      expect(response.status).toBe(201);

      const body = await response.json();
      const { data } = body;

      // HU-013: For Spanish input, both descriptions should be identical
      expect(data.language).toBe('es');
      expect(data.originalDescription).toBe(spanishDescription);
      expect(data.description).toBe(spanishDescription);
    });

    it('should include language field in response', async () => {
      const bookData = {
        ...e2eFixtures.validBook,
        isbn: generateUniqueISBN(),
      };

      const response = await fetch(`${E2E_BASE_URL}/api/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookData),
      });

      expect(response.status).toBe(201);

      const body = await response.json();

      // HU-013: Response must include language field
      expect(body.data).toHaveProperty('language');
      expect(typeof body.data.language).toBe('string');
      expect(body.data.language).toMatch(/^[a-z]{2}$/); // ISO 639-1 format
    });

    it('should include originalDescription field in response', async () => {
      const bookData = {
        ...e2eFixtures.validBook,
        isbn: generateUniqueISBN(),
      };

      const response = await fetch(`${E2E_BASE_URL}/api/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookData),
      });

      expect(response.status).toBe(201);

      const body = await response.json();

      // HU-013: Response must include originalDescription field
      expect(body.data).toHaveProperty('originalDescription');
      expect(typeof body.data.originalDescription).toBe('string');
      expect(body.data.originalDescription.length).toBeGreaterThan(0);
    });

    it('should return 400 when language is missing', async () => {
      const { language, ...bookWithoutLanguage } = e2eFixtures.validBook;

      const response = await fetch(`${E2E_BASE_URL}/api/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookWithoutLanguage),
      });

      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toHaveProperty('message');
    });

    it('should return 400 when language format is invalid', async () => {
      const bookData = {
        ...e2eFixtures.validBook,
        language: 'english', // Invalid: not ISO 639-1 format
        isbn: generateUniqueISBN(),
      };

      const response = await fetch(`${E2E_BASE_URL}/api/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookData),
      });

      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toHaveProperty('message');
    });

    // NOTE: Tests requiring actual translation use skipIf when the model is unavailable.
    // To run these tests, ensure the translation model is pulled in Ollama.
    it.skipIf(
      async () => {
        const svc = new OllamaTranslationService({ baseUrl: OLLAMA_URL, model: TRANSLATION_MODEL, timeoutMs: 5000, retries: 1 });
        return !(await svc.isAvailable());
      },
    )('should translate English description to Spanish', async () => {
      const englishDescription = 'A comprehensive guide to clean code principles and practices.';
      const bookData = {
        title: 'Clean Code Guide',
        authors: ['Robert C. Martin'],
        description: englishDescription,
        type: 'technical',
        format: 'pdf',
        categories: ['Programming'],
        language: 'en', // English triggers translation
        isbn: generateUniqueISBN(),
      };

      const response = await fetch(`${E2E_BASE_URL}/api/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookData),
      });

      expect(response.status).toBe(201);

      const body = await response.json();
      const { data } = body;

      // HU-013: Original English stored in originalDescription
      expect(data.language).toBe('en');
      expect(data.originalDescription).toBe(englishDescription);

      // HU-013: description should contain the Spanish translation (different from original)
      expect(typeof data.description).toBe('string');
      expect(data.description.length).toBeGreaterThan(0);
      // The translated description should differ from the English original
      expect(data.description).not.toBe(englishDescription);
    });

    it('should return 503 when translation service is unavailable', async () => {
      // Create a server with a broken translation service URL
      const { server, db, baseUrl } = await createBrokenServiceServer({
        brokenTranslation: true,
        port: 3003,
      });

      try {
        const bookData = {
          title: 'Book Requiring Translation',
          authors: ['Some Author'],
          description: 'A book with an English description that needs translation.',
          type: 'technical',
          format: 'pdf',
          categories: ['Programming'],
          language: 'en', // Non-Spanish triggers translation
          isbn: generateUniqueISBN(),
        };

        const response = await fetch(`${baseUrl}/api/books`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bookData),
        });

        expect(response.status).toBe(503);

        const body = await response.json();
        expect(body).toHaveProperty('success', false);
        expect(body).toHaveProperty('data', null);
        expect(body.error.message).toContain('unavailable');
      } finally {
        await server.close();
        await clearTestData(db);
        await closeTestDb(db);
      }
    });
  });

  describe('Service Unavailable (503)', () => {
    it('should return 503 when embedding service is unavailable', async () => {
      // Create a server with a broken embedding service URL
      const { server, db, baseUrl } = await createBrokenServiceServer({
        brokenEmbedding: true,
        port: 3004,
      });

      try {
        const bookData = {
          title: 'Book With Broken Embedding',
          authors: ['Some Author'],
          description: 'Un libro que falla porque el servicio de embeddings no está disponible.',
          type: 'technical',
          format: 'pdf',
          categories: ['Programming'],
          language: 'es', // Spanish avoids translation dependency
          isbn: generateUniqueISBN(),
        };

        const response = await fetch(`${baseUrl}/api/books`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bookData),
        });

        expect(response.status).toBe(503);

        const body = await response.json();
        expect(body).toHaveProperty('success', false);
        expect(body).toHaveProperty('data', null);
        expect(body.error.message).toContain('unavailable');
      } finally {
        await server.close();
        await clearTestData(db);
        await closeTestDb(db);
      }
    });
  });
});
