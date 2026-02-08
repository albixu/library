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
 * - Duplicate book triad conflict (409)
 * - Embedding service unavailable (503)
 * - Response format verification (no embedding exposed)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  createE2EContext,
  E2E_BASE_URL,
  generateUniqueISBN,
  e2eFixtures,
  clearTestData,
} from '../setup.js';

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

      // Verify response structure
      expect(body).toMatchObject({
        id: expect.any(String),
        title: bookData.title,
        author: bookData.author,
        description: bookData.description,
        type: bookData.type,
        format: bookData.format,
        isbn: uniqueISBN,
        available: true,
        path: bookData.path,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });

      // Verify categories (names are normalized to lowercase by the system)
      expect(body.categories).toHaveLength(1);
      expect(body.categories[0]).toMatchObject({
        id: expect.any(String),
        name: 'e2e testing',
      });

      // Verify UUID format
      expect(body.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );

      // Verify ISO date format
      expect(new Date(body.createdAt).toISOString()).toBe(body.createdAt);
      expect(new Date(body.updatedAt).toISOString()).toBe(body.updatedAt);
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

      // CRITICAL: Embedding should never be exposed in API response
      expect(body).not.toHaveProperty('embedding');
      expect(body).not.toHaveProperty('embeddings');
    });

    it('should create book without optional fields (isbn, path)', async () => {
      const bookData = {
        title: 'Book Without Optional Fields',
        author: 'Test Author',
        description: 'A book without ISBN and path.',
        type: 'novel',
        format: 'epub',
        categories: ['Fiction'],
      };

      const response = await fetch(`${E2E_BASE_URL}/api/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookData),
      });

      expect(response.status).toBe(201);

      const body = await response.json();
      expect(body.isbn).toBeNull();
      expect(body.path).toBeNull();
      expect(body.available).toBe(true); // Default value
    });

    it('should create book with multiple categories', async () => {
      const bookData = {
        title: 'Multi-Category Book',
        author: 'Test Author',
        description: 'A book with multiple categories.',
        type: 'technical',
        format: 'pdf',
        categories: ['Programming', 'Software Engineering', 'Best Practices'],
        isbn: generateUniqueISBN(),
      };

      const response = await fetch(`${E2E_BASE_URL}/api/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookData),
      });

      expect(response.status).toBe(201);

      const body = await response.json();
      expect(body.categories).toHaveLength(3);
      // Category names are normalized to lowercase by the system
      const categoryNames = body.categories.map((c: { name: string }) => c.name.toLowerCase());
      expect(categoryNames).toContain('programming');
      expect(categoryNames).toContain('software engineering');
      expect(categoryNames).toContain('best practices');
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
      expect(body).toHaveProperty('error');
      // Zod errors return "Validation failed" in error and field details in details array
      expect(body.error.toLowerCase()).toContain('validation');
      expect(body.details).toBeDefined();
      expect(body.details.some((d: string) => d.toLowerCase().includes('title'))).toBe(true);
    });

    it('should return 400 when author is missing', async () => {
      const { author, ...bookWithoutAuthor } = e2eFixtures.validBook;

      const response = await fetch(`${E2E_BASE_URL}/api/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookWithoutAuthor),
      });

      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body).toHaveProperty('error');
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
      expect(body).toHaveProperty('error');
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
      expect(body).toHaveProperty('error');
    });

    it('should return 400 when type is invalid', async () => {
      const response = await fetch(`${E2E_BASE_URL}/api/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(e2eFixtures.bookWithInvalidType),
      });

      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body).toHaveProperty('error');
      // Zod errors return "Validation failed" in error and field details in details array
      expect(body.error.toLowerCase()).toContain('validation');
      expect(body.details).toBeDefined();
      expect(body.details.some((d: string) => d.toLowerCase().includes('type'))).toBe(true);
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
      expect(body).toHaveProperty('error');
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
      expect(body).toHaveProperty('error');
    });
  });

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

      // Attempt to create duplicate with same ISBN but different title/author
      const duplicateBook = {
        ...e2eFixtures.validBook,
        title: 'Different Title',
        author: 'Different Author',
        isbn,
      };

      const response2 = await fetch(`${E2E_BASE_URL}/api/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(duplicateBook),
      });

      expect(response2.status).toBe(409);

      const body = await response2.json();
      expect(body).toHaveProperty('error');
      expect(body.error.toLowerCase()).toContain('isbn');
    });

    it('should return 409 when title/author/format triad is duplicated', async () => {
      const bookData = {
        title: 'Unique Triad Book',
        author: 'Unique Author',
        description: 'First book with this triad.',
        type: 'technical',
        format: 'pdf',
        categories: ['Testing'],
      };

      // Create first book
      const response1 = await fetch(`${E2E_BASE_URL}/api/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookData),
      });
      expect(response1.status).toBe(201);

      // Attempt to create duplicate with same author/title/format triad
      // (different type and categories don't matter - format is the key)
      const duplicateBook = {
        ...bookData,
        description: 'Second book with same triad.',
        type: 'novel', // Different type doesn't prevent duplicate
        categories: ['Other Category'],
      };

      const response2 = await fetch(`${E2E_BASE_URL}/api/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(duplicateBook),
      });

      expect(response2.status).toBe(409);

      const body = await response2.json();
      expect(body).toHaveProperty('error');
    });
  });

  describe('Service Unavailable (503)', () => {
    // Note: This test requires mocking or temporarily disabling Ollama
    // In a real scenario, we would use a test flag or mock server
    // For now, this serves as documentation of expected behavior
    it.skip('should return 503 when embedding service is unavailable', async () => {
      // This test would require:
      // 1. Stopping Ollama container
      // 2. Making request
      // 3. Verifying 503 response
      // 4. Restarting Ollama container
      //
      // Implementation deferred to avoid affecting other tests
    });
  });
});
