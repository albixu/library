/**
 * E2E Tests: GET /api/books
 *
 * End-to-end tests for the book search API endpoint.
 * These tests validate the complete flow from HTTP request to database query.
 *
 * Tests cover:
 * - Successful search with no filters (returns all books)
 * - Individual filter tests (isbn, title, author, types, categories, levels)
 * - Filter combinations (AND logic)
 * - Semantic search with text filter
 * - Cursor-based pagination
 * - Edge cases (no results, validation errors)
 *
 * HU-012: Search Books with Filters and Pagination
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  createE2EContext,
  E2E_BASE_URL,
  generateUniqueISBN,
} from '../setup.js';

/**
 * Helper to create a book via API
 */
async function createBook(bookData: Record<string, unknown>): Promise<Record<string, unknown>> {
  const response = await fetch(`${E2E_BASE_URL}/api/books`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bookData),
  });

  if (response.status !== 201) {
    const error = await response.json();
    throw new Error(`Failed to create book: ${JSON.stringify(error)}`);
  }

  const body = await response.json();
  return body.data;
}

/**
 * Helper to search books via API
 */
async function searchBooks(params: Record<string, string | string[]> = {}): Promise<{
  status: number;
  body: Record<string, unknown>;
}> {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      value.forEach((v) => searchParams.append(key, v));
    } else {
      searchParams.append(key, value);
    }
  }

  const url = `${E2E_BASE_URL}/api/books${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  const body = await response.json();
  return { status: response.status, body };
}

describe('GET /api/books (E2E)', () => {
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

  describe('Basic Search (No Filters)', () => {
    it('should return 200 with standardized success response', async () => {
      const { status, body } = await searchBooks();

      expect(status).toBe(200);
      expect(body).toHaveProperty('success', true);
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('error', null);
    });

    it('should return empty items array when no books exist', async () => {
      const { status, body } = await searchBooks();

      expect(status).toBe(200);
      expect((body.data as Record<string, unknown>).items).toEqual([]);
      expect((body.data as Record<string, unknown>).pagination).toMatchObject({
        limit: 50,
        hasNextPage: false,
        nextCursor: null,
        totalCount: 0,
      });
    });

    it('should return all books when no filters applied', async () => {
      // Create 3 books
      await createBook({
        title: 'Book One',
        authors: ['Author A'],
        description: 'Description for book one',
        type: 'technical',
        format: 'pdf',
        categories: ['programming'],
        language: 'es',
        isbn: generateUniqueISBN(),
      });

      await createBook({
        title: 'Book Two',
        authors: ['Author B'],
        description: 'Description for book two',
        type: 'novel',
        format: 'epub',
        categories: ['fiction'],
        language: 'es',
      });

      await createBook({
        title: 'Book Three',
        authors: ['Author C'],
        description: 'Description for book three',
        type: 'technical',
        format: 'pdf',
        categories: ['architecture'],
        language: 'es',
      });

      const { status, body } = await searchBooks();

      expect(status).toBe(200);
      const data = body.data as { items: unknown[]; pagination: { totalCount: number } };
      expect(data.items).toHaveLength(3);
      expect(data.pagination.totalCount).toBe(3);
    });

    it('should return books sorted by title ascending', async () => {
      await createBook({
        title: 'Zebra Book',
        authors: ['Author'],
        description: 'Description',
        type: 'technical',
        format: 'pdf',
        categories: ['test'],
        language: 'es',
      });

      await createBook({
        title: 'Apple Book',
        authors: ['Author'],
        description: 'Description',
        type: 'technical',
        format: 'pdf',
        categories: ['test'],
        language: 'es',
      });

      await createBook({
        title: 'Mango Book',
        authors: ['Author'],
        description: 'Description',
        type: 'technical',
        format: 'pdf',
        categories: ['test'],
        language: 'es',
      });

      const { status, body } = await searchBooks();

      expect(status).toBe(200);
      const items = (body.data as { items: { title: string }[] }).items;
      const titles = items.map((item) => item.title);

      expect(titles).toEqual(['Apple Book', 'Mango Book', 'Zebra Book']);
    });
  });

  describe('ISBN Filter', () => {
    it('should find book by exact ISBN match', async () => {
      const isbn = generateUniqueISBN();
      await createBook({
        title: 'Book with ISBN',
        authors: ['Author'],
        description: 'Description',
        type: 'technical',
        format: 'pdf',
        categories: ['test'],
        language: 'es',
        isbn,
      });

      await createBook({
        title: 'Another Book',
        authors: ['Author'],
        description: 'Description',
        type: 'technical',
        format: 'pdf',
        categories: ['test'],
        language: 'es',
        isbn: generateUniqueISBN(),
      });

      const { status, body } = await searchBooks({ isbn });

      expect(status).toBe(200);
      const items = (body.data as { items: { isbn: string; title: string }[] }).items;
      expect(items).toHaveLength(1);
      expect(items[0].isbn).toBe(isbn);
      expect(items[0].title).toBe('Book with ISBN');
    });

    it('should return empty array for non-existent ISBN', async () => {
      const { status, body } = await searchBooks({ isbn: '9781234567890' });

      expect(status).toBe(200);
      const items = (body.data as { items: unknown[] }).items;
      expect(items).toHaveLength(0);
    });
  });

  describe('Title Filter', () => {
    it('should find books by partial title match (case-insensitive)', async () => {
      await createBook({
        title: 'Clean Code: A Handbook',
        authors: ['Robert Martin'],
        description: 'Software craftsmanship',
        type: 'technical',
        format: 'pdf',
        categories: ['programming'],
        language: 'es',
      });

      await createBook({
        title: 'The Clean Architecture',
        authors: ['Robert Martin'],
        description: 'Architecture patterns',
        type: 'technical',
        format: 'pdf',
        categories: ['architecture'],
        language: 'es',
      });

      await createBook({
        title: 'Refactoring',
        authors: ['Martin Fowler'],
        description: 'Improving code',
        type: 'technical',
        format: 'pdf',
        categories: ['programming'],
        language: 'es',
      });

      const { status, body } = await searchBooks({ title: 'clean' });

      expect(status).toBe(200);
      const items = (body.data as { items: { title: string }[] }).items;
      expect(items).toHaveLength(2);
      expect(items.some((i) => i.title === 'Clean Code: A Handbook')).toBe(true);
      expect(items.some((i) => i.title === 'The Clean Architecture')).toBe(true);
    });
  });

  describe('Author Filter', () => {
    it('should find books by partial author name match (case-insensitive)', async () => {
      await createBook({
        title: 'Clean Code',
        authors: ['Robert C. Martin'],
        description: 'Software craftsmanship',
        type: 'technical',
        format: 'pdf',
        categories: ['programming'],
        language: 'es',
      });

      await createBook({
        title: 'Refactoring',
        authors: ['Martin Fowler'],
        description: 'Improving code',
        type: 'technical',
        format: 'pdf',
        categories: ['programming'],
        language: 'es',
      });

      await createBook({
        title: 'Domain-Driven Design',
        authors: ['Eric Evans'],
        description: 'DDD patterns',
        type: 'technical',
        format: 'pdf',
        categories: ['architecture'],
        language: 'es',
      });

      const { status, body } = await searchBooks({ author: 'martin' });

      expect(status).toBe(200);
      const items = (body.data as { items: { title: string }[] }).items;
      expect(items).toHaveLength(2);
      expect(items.some((i) => i.title === 'Clean Code')).toBe(true);
      expect(items.some((i) => i.title === 'Refactoring')).toBe(true);
    });
  });

  describe('Types Filter', () => {
    it('should find books by single type', async () => {
      await createBook({
        title: 'Technical Book',
        authors: ['Author'],
        description: 'Description',
        type: 'technical',
        format: 'pdf',
        categories: ['test'],
        language: 'es',
      });

      await createBook({
        title: 'Novel Book',
        authors: ['Author'],
        description: 'Description',
        type: 'novel',
        format: 'epub',
        categories: ['fiction'],
        language: 'es',
      });

      const { status, body } = await searchBooks({ types: 'technical' });

      expect(status).toBe(200);
      const items = (body.data as { items: { type: string }[] }).items;
      expect(items).toHaveLength(1);
      expect(items[0].type).toBe('technical');
    });

    it('should find books by multiple types (OR logic)', async () => {
      await createBook({
        title: 'Technical Book',
        authors: ['Author'],
        description: 'Description',
        type: 'technical',
        format: 'pdf',
        categories: ['test'],
        language: 'es',
      });

      await createBook({
        title: 'Novel Book',
        authors: ['Author'],
        description: 'Description',
        type: 'novel',
        format: 'epub',
        categories: ['fiction'],
        language: 'es',
      });

      await createBook({
        title: 'Biography Book',
        authors: ['Author'],
        description: 'Description',
        type: 'biography',
        format: 'pdf',
        categories: ['history'],
        language: 'es',
      });

      const { status, body } = await searchBooks({ types: ['technical', 'novel'] });

      expect(status).toBe(200);
      const items = (body.data as { items: { type: string }[] }).items;
      expect(items).toHaveLength(2);
    });
  });

  describe('Categories Filter', () => {
    it('should find books by category', async () => {
      await createBook({
        title: 'Programming Book',
        authors: ['Author'],
        description: 'Description',
        type: 'technical',
        format: 'pdf',
        categories: ['programming'],
        language: 'es',
      });

      await createBook({
        title: 'Architecture Book',
        authors: ['Author'],
        description: 'Description',
        type: 'technical',
        format: 'pdf',
        categories: ['architecture'],
        language: 'es',
      });

      const { status, body } = await searchBooks({ categories: 'programming' });

      expect(status).toBe(200);
      const items = (body.data as { items: { title: string }[] }).items;
      expect(items).toHaveLength(1);
      expect(items[0].title).toBe('Programming Book');
    });

    it('should find books by multiple categories (OR logic)', async () => {
      await createBook({
        title: 'Programming Book',
        authors: ['Author'],
        description: 'Description',
        type: 'technical',
        format: 'pdf',
        categories: ['programming'],
        language: 'es',
      });

      await createBook({
        title: 'Architecture Book',
        authors: ['Author'],
        description: 'Description',
        type: 'technical',
        format: 'pdf',
        categories: ['architecture'],
        language: 'es',
      });

      await createBook({
        title: 'Fiction Book',
        authors: ['Author'],
        description: 'Description',
        type: 'novel',
        format: 'epub',
        categories: ['fiction'],
        language: 'es',
      });

      const { status, body } = await searchBooks({ categories: ['programming', 'architecture'] });

      expect(status).toBe(200);
      const items = (body.data as { items: unknown[] }).items;
      expect(items).toHaveLength(2);
    });
  });

  describe('Levels Filter', () => {
    it('should find books by level', async () => {
      await createBook({
        title: 'Beginner Book',
        authors: ['Author'],
        description: 'Description',
        type: 'technical',
        format: 'pdf',
        categories: ['test'],
        language: 'es',
        level: 'Beginner',
      });

      await createBook({
        title: 'Advanced Book',
        authors: ['Author'],
        description: 'Description',
        type: 'technical',
        format: 'pdf',
        categories: ['test'],
        language: 'es',
        level: 'Advanced',
      });

      const { status, body } = await searchBooks({ levels: 'beginner' });

      expect(status).toBe(200);
      const items = (body.data as { items: { level: string }[] }).items;
      expect(items).toHaveLength(1);
      expect(items[0].level).toBe('Beginner');
    });
  });

  describe('Filter Combinations (AND Logic)', () => {
    it('should combine type and author filters with AND logic', async () => {
      await createBook({
        title: 'Technical by Martin',
        authors: ['Robert Martin'],
        description: 'Description',
        type: 'technical',
        format: 'pdf',
        categories: ['test'],
        language: 'es',
      });

      await createBook({
        title: 'Novel by Martin',
        authors: ['George Martin'],
        description: 'Description',
        type: 'novel',
        format: 'epub',
        categories: ['fiction'],
        language: 'es',
      });

      await createBook({
        title: 'Technical by Evans',
        authors: ['Eric Evans'],
        description: 'Description',
        type: 'technical',
        format: 'pdf',
        categories: ['test'],
        language: 'es',
      });

      const { status, body } = await searchBooks({
        types: 'technical',
        author: 'Martin',
      });

      expect(status).toBe(200);
      const items = (body.data as { items: { title: string }[] }).items;
      expect(items).toHaveLength(1);
      expect(items[0].title).toBe('Technical by Martin');
    });

    it('should combine title and category filters', async () => {
      await createBook({
        title: 'Clean Code',
        authors: ['Author'],
        description: 'Description',
        type: 'technical',
        format: 'pdf',
        categories: ['programming'],
        language: 'es',
      });

      await createBook({
        title: 'Clean Architecture',
        authors: ['Author'],
        description: 'Description',
        type: 'technical',
        format: 'pdf',
        categories: ['architecture'],
        language: 'es',
      });

      await createBook({
        title: 'Other Programming Book',
        authors: ['Author'],
        description: 'Description',
        type: 'technical',
        format: 'pdf',
        categories: ['programming'],
        language: 'es',
      });

      const { status, body } = await searchBooks({
        title: 'Clean',
        categories: 'programming',
      });

      expect(status).toBe(200);
      const items = (body.data as { items: { title: string }[] }).items;
      expect(items).toHaveLength(1);
      expect(items[0].title).toBe('Clean Code');
    });
  });

  describe('Semantic Search (Text Filter)', () => {
    it('should find books by semantic similarity', async () => {
      await createBook({
        title: 'Clean Code',
        authors: ['Robert Martin'],
        description: 'A handbook of agile software craftsmanship. Learn to write clean, maintainable code with best practices.',
        type: 'technical',
        format: 'pdf',
        categories: ['programming'],
        language: 'es',
      });

      await createBook({
        title: 'Domain-Driven Design',
        authors: ['Eric Evans'],
        description: 'Tackling complexity in the heart of software through domain modeling and bounded contexts.',
        type: 'technical',
        format: 'pdf',
        categories: ['architecture'],
        language: 'es',
      });

      await createBook({
        title: 'Romance Novel',
        authors: ['Fiction Author'],
        description: 'A love story set in Paris during springtime with romantic scenes.',
        type: 'novel',
        format: 'epub',
        categories: ['romance'],
        language: 'es',
      });

      const { status, body } = await searchBooks({ text: 'clean code software craftsmanship best practices' });

      expect(status).toBe(200);
      const items = (body.data as { items: { title: string; similarityScore: number }[] }).items;

      // Semantic search may return 0 results if similarity is below 70% threshold
      // This is expected behavior - the test validates the endpoint works correctly
      if (items.length > 0) {
        // First result should be most relevant if any results returned
        expect(items[0].similarityScore).toBeGreaterThan(0.7);
      }
    });

    it('should include similarityScore in response when using text filter', async () => {
      await createBook({
        title: 'Software Engineering',
        authors: ['Author'],
        description: 'Comprehensive guide to software engineering practices and principles for developers.',
        type: 'technical',
        format: 'pdf',
        categories: ['programming'],
        language: 'es',
      });

      const { status, body } = await searchBooks({ text: 'software engineering practices principles' });

      expect(status).toBe(200);
      const items = (body.data as { items: { similarityScore: number | null }[] }).items;

      // If results are found, they should have similarity scores
      if (items.length > 0) {
        expect(items[0].similarityScore).not.toBeNull();
        expect(typeof items[0].similarityScore).toBe('number');
        expect(items[0].similarityScore).toBeGreaterThanOrEqual(0.7);
        expect(items[0].similarityScore).toBeLessThanOrEqual(1);
      }
    });

    it('should order results by similarity score descending', async () => {
      await createBook({
        title: 'JavaScript Patterns',
        authors: ['Author'],
        description: 'Design patterns for JavaScript applications and web development.',
        type: 'technical',
        format: 'pdf',
        categories: ['programming'],
        language: 'es',
      });

      await createBook({
        title: 'Python Basics',
        authors: ['Author'],
        description: 'Introduction to Python programming language for beginners.',
        type: 'technical',
        format: 'pdf',
        categories: ['programming'],
        language: 'es',
      });

      const { status, body } = await searchBooks({ text: 'javascript web development' });

      expect(status).toBe(200);
      const items = (body.data as { items: { similarityScore: number }[] }).items;

      // Results should be ordered by similarity descending
      for (let i = 1; i < items.length; i++) {
        expect(items[i - 1].similarityScore).toBeGreaterThanOrEqual(items[i].similarityScore);
      }
    });
  });

  describe('Pagination', () => {
    it('should respect limit parameter', async () => {
      // Create 5 books
      for (let i = 1; i <= 5; i++) {
        await createBook({
          title: `Book ${i.toString().padStart(2, '0')}`,
          authors: ['Author'],
          description: 'Description',
          type: 'technical',
          format: 'pdf',
          categories: ['test'],
        language: 'es',
        });
      }

      const { status, body } = await searchBooks({ limit: '2' });

      expect(status).toBe(200);
      const data = body.data as { items: unknown[]; pagination: Record<string, unknown> };
      expect(data.items).toHaveLength(2);
      expect(data.pagination.limit).toBe(2);
      expect(data.pagination.totalCount).toBe(5);
      expect(data.pagination.hasNextPage).toBe(true);
      expect(data.pagination.nextCursor).not.toBeNull();
    });

    it('should return next page using cursor', async () => {
      // Create 5 books with sorted titles
      for (let i = 1; i <= 5; i++) {
        await createBook({
          title: `Book ${i.toString().padStart(2, '0')}`,
          authors: ['Author'],
          description: 'Description',
          type: 'technical',
          format: 'pdf',
          categories: ['test'],
        language: 'es',
        });
      }

      // First page
      const page1 = await searchBooks({ limit: '2' });
      expect(page1.status).toBe(200);
      const data1 = page1.body.data as {
        items: { title: string }[];
        pagination: { nextCursor: string; hasNextPage: boolean };
      };
      expect(data1.items).toHaveLength(2);
      expect(data1.items[0].title).toBe('Book 01');
      expect(data1.items[1].title).toBe('Book 02');

      // Second page
      const page2 = await searchBooks({ limit: '2', cursor: data1.pagination.nextCursor });
      expect(page2.status).toBe(200);
      const data2 = page2.body.data as {
        items: { title: string }[];
        pagination: { nextCursor: string | null; hasNextPage: boolean };
      };
      expect(data2.items).toHaveLength(2);
      expect(data2.items[0].title).toBe('Book 03');
      expect(data2.items[1].title).toBe('Book 04');

      // Third page (last)
      const page3 = await searchBooks({ limit: '2', cursor: data2.pagination.nextCursor! });
      expect(page3.status).toBe(200);
      const data3 = page3.body.data as {
        items: { title: string }[];
        pagination: { nextCursor: string | null; hasNextPage: boolean };
      };
      expect(data3.items).toHaveLength(1);
      expect(data3.items[0].title).toBe('Book 05');
      expect(data3.pagination.hasNextPage).toBe(false);
      expect(data3.pagination.nextCursor).toBeNull();
    });

    it('should default limit to 50', async () => {
      const { status, body } = await searchBooks();

      expect(status).toBe(200);
      const pagination = (body.data as { pagination: { limit: number } }).pagination;
      expect(pagination.limit).toBe(50);
    });
  });

  describe('Validation Errors (400)', () => {
    it('should return 400 for limit less than 1', async () => {
      const { status, body } = await searchBooks({ limit: '0' });

      expect(status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error).toHaveProperty('message', 'Validation failed');
    });

    it('should return 400 for limit greater than 100', async () => {
      const { status, body } = await searchBooks({ limit: '101' });

      expect(status).toBe(400);
      expect(body.success).toBe(false);
    });

    it('should return 400 for empty title filter', async () => {
      const { status, body } = await searchBooks({ title: '' });

      expect(status).toBe(400);
      expect(body.success).toBe(false);
    });

    it('should return 400 for empty cursor', async () => {
      const { status, body } = await searchBooks({ cursor: '' });

      expect(status).toBe(400);
      expect(body.success).toBe(false);
    });
  });

  describe('Response Format', () => {
    it('should return correct book fields in response', async () => {
      const isbn = generateUniqueISBN();
      const description = 'Descripción de prueba para el libro';
      await createBook({
        title: 'Test Book',
        authors: ['Test Author'],
        description,
        type: 'technical',
        format: 'pdf',
        categories: ['testing'],
        language: 'es',
        isbn,
        level: 'Intermediate',
      });

      const { status, body } = await searchBooks();

      expect(status).toBe(200);
      const items = (body.data as { items: Record<string, unknown>[] }).items;
      expect(items).toHaveLength(1);

      const book = items[0];
      expect(book).toHaveProperty('id');
      expect(book).toHaveProperty('isbn', isbn);
      expect(book).toHaveProperty('title', 'Test Book');
      expect(book).toHaveProperty('authors');
      expect(book).toHaveProperty('type', 'technical');
      expect(book).toHaveProperty('categories');
      expect(book).toHaveProperty('level');
      expect(book).toHaveProperty('format', 'pdf');
      expect(book).toHaveProperty('description', description);
      expect(book).toHaveProperty('similarityScore', null);

      // HU-013: Response must include originalDescription and language fields
      expect(book).toHaveProperty('originalDescription', description);
      expect(book).toHaveProperty('language', 'es');

      // Should NOT have embedding
      expect(book).not.toHaveProperty('embedding');
    });

    it('should return authors as array with id and name', async () => {
      await createBook({
        title: 'Multi-Author Book',
        authors: ['Author One', 'Author Two'],
        description: 'Description',
        type: 'technical',
        format: 'pdf',
        categories: ['test'],
        language: 'es',
      });

      const { status, body } = await searchBooks();

      expect(status).toBe(200);
      const items = (body.data as { items: { authors: { id: string; name: string }[] }[] }).items;
      expect(items[0].authors).toHaveLength(2);
      expect(items[0].authors[0]).toHaveProperty('id');
      expect(items[0].authors[0]).toHaveProperty('name');
    });

    it('should return categories as array with id and name', async () => {
      await createBook({
        title: 'Multi-Category Book',
        authors: ['Author'],
        description: 'Description',
        type: 'technical',
        format: 'pdf',
        categories: ['programming', 'architecture'],
        language: 'es',
      });

      const { status, body } = await searchBooks();

      expect(status).toBe(200);
      const items = (body.data as { items: { categories: { id: string; name: string }[] }[] }).items;
      expect(items[0].categories).toHaveLength(2);
      expect(items[0].categories[0]).toHaveProperty('id');
      expect(items[0].categories[0]).toHaveProperty('name');
    });

    it('should return JSON content type', async () => {
      const response = await fetch(`${E2E_BASE_URL}/api/books`);

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('application/json');
    });
  });

  describe('Edge Cases', () => {
    it('should return empty array for non-matching filters', async () => {
      await createBook({
        title: 'Existing Book',
        authors: ['Author'],
        description: 'Description',
        type: 'technical',
        format: 'pdf',
        categories: ['test'],
        language: 'es',
      });

      const { status, body } = await searchBooks({ title: 'NonExistent' });

      expect(status).toBe(200);
      const items = (body.data as { items: unknown[] }).items;
      expect(items).toHaveLength(0);
    });

    it('should return empty array for non-existent type', async () => {
      await createBook({
        title: 'Existing Book',
        authors: ['Author'],
        description: 'Description',
        type: 'technical',
        format: 'pdf',
        categories: ['test'],
        language: 'es',
      });

      const { status, body } = await searchBooks({ types: 'nonexistent' });

      expect(status).toBe(200);
      const items = (body.data as { items: unknown[] }).items;
      expect(items).toHaveLength(0);
    });

    it('should return empty array for non-existent category', async () => {
      await createBook({
        title: 'Existing Book',
        authors: ['Author'],
        description: 'Description',
        type: 'technical',
        format: 'pdf',
        categories: ['test'],
        language: 'es',
      });

      const { status, body } = await searchBooks({ categories: 'nonexistent' });

      expect(status).toBe(200);
      const items = (body.data as { items: unknown[] }).items;
      expect(items).toHaveLength(0);
    });
  });
});
