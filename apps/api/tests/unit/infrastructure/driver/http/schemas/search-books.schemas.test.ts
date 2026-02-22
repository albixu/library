/**
 * Search Books Schemas Unit Tests
 *
 * Tests for Zod validation schemas used in GET /api/books endpoint.
 * These schemas validate query parameters for book search.
 *
 * HU-012: Search Books with Filters and Pagination
 */

import { describe, it, expect } from 'vitest';
import { searchBooksQuerySchema } from '../../../../../../src/infrastructure/driver/http/schemas/search-books.schemas.js';

describe('searchBooksQuerySchema', () => {
  describe('valid queries', () => {
    it('should accept empty query (no filters)', () => {
      const result = searchBooksQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(50); // default
      }
    });

    it('should accept isbn filter', () => {
      const result = searchBooksQuerySchema.safeParse({ isbn: '9780132350884' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isbn).toBe('9780132350884');
      }
    });

    it('should accept title filter and trim whitespace', () => {
      const result = searchBooksQuerySchema.safeParse({ title: '  Clean Code  ' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe('Clean Code');
      }
    });

    it('should accept author filter and trim whitespace', () => {
      const result = searchBooksQuerySchema.safeParse({ author: '  Robert Martin  ' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.author).toBe('Robert Martin');
      }
    });

    it('should accept text filter for semantic search', () => {
      const result = searchBooksQuerySchema.safeParse({
        text: 'books about clean software architecture',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.text).toBe('books about clean software architecture');
      }
    });

    it('should accept single type as string', () => {
      const result = searchBooksQuerySchema.safeParse({ types: 'technical' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.types).toEqual(['technical']);
      }
    });

    it('should accept multiple types as array', () => {
      const result = searchBooksQuerySchema.safeParse({
        types: ['technical', 'reference'],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.types).toEqual(['technical', 'reference']);
      }
    });

    it('should accept single category as string', () => {
      const result = searchBooksQuerySchema.safeParse({ categories: 'programming' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.categories).toEqual(['programming']);
      }
    });

    it('should accept multiple categories as array', () => {
      const result = searchBooksQuerySchema.safeParse({
        categories: ['programming', 'software-engineering'],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.categories).toEqual(['programming', 'software-engineering']);
      }
    });

    it('should accept single level as string', () => {
      const result = searchBooksQuerySchema.safeParse({ levels: 'intermediate' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.levels).toEqual(['intermediate']);
      }
    });

    it('should accept multiple levels as array', () => {
      const result = searchBooksQuerySchema.safeParse({
        levels: ['beginner', 'intermediate', 'advanced'],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.levels).toEqual(['beginner', 'intermediate', 'advanced']);
      }
    });

    it('should accept limit as string and coerce to number', () => {
      const result = searchBooksQuerySchema.safeParse({ limit: '25' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(25);
      }
    });

    it('should accept limit as number', () => {
      const result = searchBooksQuerySchema.safeParse({ limit: 25 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(25);
      }
    });

    it('should accept cursor string', () => {
      const cursor = 'eyJsYXN0SWQiOiIxMjM0In0=';
      const result = searchBooksQuerySchema.safeParse({ cursor });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.cursor).toBe(cursor);
      }
    });

    it('should accept all filters combined', () => {
      const query = {
        isbn: '9780132350884',
        title: 'Clean',
        author: 'Martin',
        text: 'software craftsmanship',
        types: ['technical'],
        categories: ['programming'],
        levels: ['intermediate'],
        limit: '20',
        cursor: 'abc123',
      };

      const result = searchBooksQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isbn).toBe('9780132350884');
        expect(result.data.title).toBe('Clean');
        expect(result.data.author).toBe('Martin');
        expect(result.data.text).toBe('software craftsmanship');
        expect(result.data.types).toEqual(['technical']);
        expect(result.data.categories).toEqual(['programming']);
        expect(result.data.levels).toEqual(['intermediate']);
        expect(result.data.limit).toBe(20);
        expect(result.data.cursor).toBe('abc123');
      }
    });
  });

  describe('limit validation', () => {
    it('should default limit to 50', () => {
      const result = searchBooksQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(50);
      }
    });

    it('should reject limit less than 1', () => {
      const result = searchBooksQuerySchema.safeParse({ limit: '0' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('at least 1');
      }
    });

    it('should reject limit greater than 100', () => {
      const result = searchBooksQuerySchema.safeParse({ limit: '101' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('at most 100');
      }
    });

    it('should accept limit of 1', () => {
      const result = searchBooksQuerySchema.safeParse({ limit: '1' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(1);
      }
    });

    it('should accept limit of 100', () => {
      const result = searchBooksQuerySchema.safeParse({ limit: '100' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(100);
      }
    });

    it('should reject non-numeric limit', () => {
      const result = searchBooksQuerySchema.safeParse({ limit: 'abc' });
      expect(result.success).toBe(false);
    });
  });

  describe('string field validation', () => {
    it('should reject empty isbn', () => {
      const result = searchBooksQuerySchema.safeParse({ isbn: '' });
      expect(result.success).toBe(false);
    });

    it('should reject empty title', () => {
      const result = searchBooksQuerySchema.safeParse({ title: '' });
      expect(result.success).toBe(false);
    });

    it('should reject empty author', () => {
      const result = searchBooksQuerySchema.safeParse({ author: '' });
      expect(result.success).toBe(false);
    });

    it('should reject empty text', () => {
      const result = searchBooksQuerySchema.safeParse({ text: '' });
      expect(result.success).toBe(false);
    });

    it('should reject title that is only whitespace', () => {
      const result = searchBooksQuerySchema.safeParse({ title: '   ' });
      expect(result.success).toBe(false);
    });

    it('should reject isbn exceeding max length', () => {
      const result = searchBooksQuerySchema.safeParse({ isbn: 'x'.repeat(18) });
      expect(result.success).toBe(false);
    });

    it('should reject title exceeding max length', () => {
      const result = searchBooksQuerySchema.safeParse({ title: 'x'.repeat(501) });
      expect(result.success).toBe(false);
    });

    it('should reject author exceeding max length', () => {
      const result = searchBooksQuerySchema.safeParse({ author: 'x'.repeat(301) });
      expect(result.success).toBe(false);
    });

    it('should reject text exceeding max length', () => {
      const result = searchBooksQuerySchema.safeParse({ text: 'x'.repeat(1001) });
      expect(result.success).toBe(false);
    });
  });

  describe('array field validation', () => {
    it('should reject empty types array', () => {
      const result = searchBooksQuerySchema.safeParse({ types: [] });
      expect(result.success).toBe(false);
    });

    it('should reject empty categories array', () => {
      const result = searchBooksQuerySchema.safeParse({ categories: [] });
      expect(result.success).toBe(false);
    });

    it('should reject empty levels array', () => {
      const result = searchBooksQuerySchema.safeParse({ levels: [] });
      expect(result.success).toBe(false);
    });

    it('should filter out empty string values from types', () => {
      const result = searchBooksQuerySchema.safeParse({ types: ['technical', '', '  '] });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.types).toEqual(['technical']);
      }
    });

    it('should filter out empty string values from categories', () => {
      const result = searchBooksQuerySchema.safeParse({ categories: ['programming', '', '  '] });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.categories).toEqual(['programming']);
      }
    });

    it('should filter out empty string values from levels', () => {
      const result = searchBooksQuerySchema.safeParse({ levels: ['beginner', '', '  '] });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.levels).toEqual(['beginner']);
      }
    });

    it('should reject types with only empty string values', () => {
      const result = searchBooksQuerySchema.safeParse({ types: ['', '  '] });
      expect(result.success).toBe(false);
    });

    it('should reject categories with only empty string values', () => {
      const result = searchBooksQuerySchema.safeParse({ categories: ['', '  '] });
      expect(result.success).toBe(false);
    });

    it('should reject levels with only empty string values', () => {
      const result = searchBooksQuerySchema.safeParse({ levels: ['', '  '] });
      expect(result.success).toBe(false);
    });

    it('should reject types exceeding max count (20)', () => {
      const result = searchBooksQuerySchema.safeParse({
        types: Array(21).fill('type'),
      });
      expect(result.success).toBe(false);
    });

    it('should reject categories exceeding max count (20)', () => {
      const result = searchBooksQuerySchema.safeParse({
        categories: Array(21).fill('category'),
      });
      expect(result.success).toBe(false);
    });

    it('should reject levels exceeding max count (20)', () => {
      const result = searchBooksQuerySchema.safeParse({
        levels: Array(21).fill('level'),
      });
      expect(result.success).toBe(false);
    });

    it('should trim and lowercase array values', () => {
      const result = searchBooksQuerySchema.safeParse({
        types: ['  Technical  ', 'REFERENCE'],
        categories: ['  Programming  '],
        levels: ['  INTERMEDIATE  '],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.types).toEqual(['technical', 'reference']);
        expect(result.data.categories).toEqual(['programming']);
        expect(result.data.levels).toEqual(['intermediate']);
      }
    });
  });

  describe('cursor validation', () => {
    it('should accept undefined cursor', () => {
      const result = searchBooksQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.cursor).toBeUndefined();
      }
    });

    it('should reject empty cursor', () => {
      const result = searchBooksQuerySchema.safeParse({ cursor: '' });
      expect(result.success).toBe(false);
    });

    it('should accept valid cursor string', () => {
      const result = searchBooksQuerySchema.safeParse({
        cursor: 'eyJsYXN0SWQiOiIxMjM0In0=',
      });
      expect(result.success).toBe(true);
    });
  });
});
