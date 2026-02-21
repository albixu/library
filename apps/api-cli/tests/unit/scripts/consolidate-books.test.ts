/**
 * Unit tests for consolidate-books.ts script
 */

import { describe, it, expect, vi } from 'vitest';
import {
  transformBook,
  isValidSourceBook,
  getExistingIsbns,
  type SourceBook,
  type ConsolidatedBook,
} from '../../../scripts/consolidate-books.js';

describe('consolidate-books', () => {
  describe('transformBook', () => {
    it('should preserve all original properties and add type/format', () => {
      const source: SourceBook = {
        id: '9781234567890',
        language: 'en',
        level: 'Intermediate',
        title: 'Test Book',
        authors: ['Author One', 'Author Two'],
        pages: '300',
        publication_date: 'January 2024',
        description: 'A test description',
        tags: ['JavaScript', 'TypeScript'],
      };

      const result = transformBook(source);

      // Original properties preserved
      expect(result.id).toBe('9781234567890');
      expect(result.title).toBe('Test Book');
      expect(result.authors).toEqual(['Author One', 'Author Two']);
      expect(result.description).toBe('A test description');
      expect(result.language).toBe('en');
      expect(result.level).toBe('Intermediate');
      expect(result.pages).toBe('300');
      expect(result.publication_date).toBe('January 2024');
      expect(result.tags).toEqual(['JavaScript', 'TypeScript']);
      // Added properties
      expect(result.type).toBe('technical');
      expect(result.format).toBe('epub');
    });

    it('should preserve id field (not rename to isbn)', () => {
      const source: SourceBook = {
        id: '0987654321098',
        title: 'Another Book',
        authors: ['Some Author'],
        description: 'Description here',
      };

      const result = transformBook(source);

      expect(result.id).toBe('0987654321098');
    });

    it('should preserve tags as-is (not map to categories)', () => {
      const source: SourceBook = {
        id: '1111111111111',
        title: 'Tagged Book',
        authors: ['Author'],
        description: 'Has tags',
        tags: ['Category1', 'Category2', 'Category3'],
      };

      const result = transformBook(source);

      expect(result.tags).toEqual(['Category1', 'Category2', 'Category3']);
    });

    it('should handle undefined tags (preserve as undefined)', () => {
      const source: SourceBook = {
        id: '2222222222222',
        title: 'No Tags Book',
        authors: ['Author'],
        description: 'No tags here',
      };

      const result = transformBook(source);

      expect(result.tags).toBeUndefined();
    });

    it('should preserve empty tags array', () => {
      const source: SourceBook = {
        id: '3333333333333',
        title: 'Empty Tags Book',
        authors: ['Author'],
        description: 'Empty tags',
        tags: [],
      };

      const result = transformBook(source);

      expect(result.tags).toEqual([]);
    });

    it('should always set type to technical', () => {
      const source: SourceBook = {
        id: '4444444444444',
        title: 'Any Book',
        authors: ['Author'],
        description: 'Any description',
      };

      const result = transformBook(source);

      expect(result.type).toBe('technical');
    });

    it('should always set format to epub', () => {
      const source: SourceBook = {
        id: '5555555555555',
        title: 'Any Book',
        authors: ['Author'],
        description: 'Any description',
      };

      const result = transformBook(source);

      expect(result.format).toBe('epub');
    });

    it('should preserve language field', () => {
      const source: SourceBook = {
        id: '7777777777777',
        language: 'es',
        title: 'Spanish Book',
        authors: ['Autor'],
        description: 'Descripción',
      };

      const result = transformBook(source);

      expect(result.language).toBe('es');
    });

    it('should preserve level field', () => {
      const source: SourceBook = {
        id: '8888888888888',
        level: 'Advanced',
        title: 'Advanced Book',
        authors: ['Expert Author'],
        description: 'Expert content',
      };

      const result = transformBook(source);

      expect(result.level).toBe('Advanced');
    });

    it('should preserve pages field', () => {
      const source: SourceBook = {
        id: '9999999999999',
        pages: '500',
        title: 'Long Book',
        authors: ['Prolific Author'],
        description: 'Lots of content',
      };

      const result = transformBook(source);

      expect(result.pages).toBe('500');
    });

    it('should preserve publication_date field', () => {
      const source: SourceBook = {
        id: '1010101010101',
        publication_date: 'March 2025',
        title: 'Future Book',
        authors: ['Time Traveler'],
        description: 'Future content',
      };

      const result = transformBook(source);

      expect(result.publication_date).toBe('March 2025');
    });

    it('should return frozen object', () => {
      const source: SourceBook = {
        id: '1212121212121',
        title: 'Frozen Book',
        authors: ['Elsa'],
        description: 'Let it go',
      };

      const result = transformBook(source);

      expect(Object.isFrozen(result)).toBe(true);
    });

    it('should preserve all authors in order', () => {
      const source: SourceBook = {
        id: '1313131313131',
        title: 'Multi Author Book',
        authors: ['First Author', 'Second Author', 'Third Author', 'Fourth Author'],
        description: 'Written by many',
      };

      const result = transformBook(source);

      expect(result.authors).toEqual([
        'First Author',
        'Second Author',
        'Third Author',
        'Fourth Author',
      ]);
    });
  });

  describe('isValidSourceBook', () => {
    it('should return true for valid source book with all fields', () => {
      const book = {
        id: '9781234567890',
        language: 'en',
        level: 'Intermediate',
        title: 'Valid Book',
        authors: ['Author One'],
        pages: '200',
        publication_date: 'January 2024',
        description: 'Valid description',
        tags: ['Tag1', 'Tag2'],
      };

      expect(isValidSourceBook(book)).toBe(true);
    });

    it('should return true for valid source book with minimal fields', () => {
      const book = {
        id: '9781234567890',
        title: 'Minimal Book',
        authors: ['Author'],
        description: 'Description',
      };

      expect(isValidSourceBook(book)).toBe(true);
    });

    it('should return true for book with multiple authors', () => {
      const book = {
        id: '9781234567890',
        title: 'Multi Author Book',
        authors: ['Author 1', 'Author 2', 'Author 3'],
        description: 'Description',
      };

      expect(isValidSourceBook(book)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isValidSourceBook(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isValidSourceBook(undefined)).toBe(false);
    });

    it('should return false for primitive values', () => {
      expect(isValidSourceBook('string')).toBe(false);
      expect(isValidSourceBook(123)).toBe(false);
      expect(isValidSourceBook(true)).toBe(false);
    });

    it('should return false for missing id', () => {
      const book = {
        title: 'No ID Book',
        authors: ['Author'],
        description: 'Description',
      };

      expect(isValidSourceBook(book)).toBe(false);
    });

    it('should return false for empty id', () => {
      const book = {
        id: '',
        title: 'Empty ID Book',
        authors: ['Author'],
        description: 'Description',
      };

      expect(isValidSourceBook(book)).toBe(false);
    });

    it('should return false for non-string id', () => {
      const book = {
        id: 12345,
        title: 'Numeric ID Book',
        authors: ['Author'],
        description: 'Description',
      };

      expect(isValidSourceBook(book)).toBe(false);
    });

    it('should return false for missing title', () => {
      const book = {
        id: '9781234567890',
        authors: ['Author'],
        description: 'Description',
      };

      expect(isValidSourceBook(book)).toBe(false);
    });

    it('should return false for empty title', () => {
      const book = {
        id: '9781234567890',
        title: '',
        authors: ['Author'],
        description: 'Description',
      };

      expect(isValidSourceBook(book)).toBe(false);
    });

    it('should return false for non-string title', () => {
      const book = {
        id: '9781234567890',
        title: 123,
        authors: ['Author'],
        description: 'Description',
      };

      expect(isValidSourceBook(book)).toBe(false);
    });

    it('should return false for missing authors', () => {
      const book = {
        id: '9781234567890',
        title: 'No Authors Book',
        description: 'Description',
      };

      expect(isValidSourceBook(book)).toBe(false);
    });

    it('should return false for empty authors array', () => {
      const book = {
        id: '9781234567890',
        title: 'Empty Authors Book',
        authors: [],
        description: 'Description',
      };

      expect(isValidSourceBook(book)).toBe(false);
    });

    it('should return false for non-array authors', () => {
      const book = {
        id: '9781234567890',
        title: 'String Author Book',
        authors: 'Single Author',
        description: 'Description',
      };

      expect(isValidSourceBook(book)).toBe(false);
    });

    it('should return false for authors with non-string elements', () => {
      const book = {
        id: '9781234567890',
        title: 'Mixed Authors Book',
        authors: ['Valid Author', 123, 'Another Author'],
        description: 'Description',
      };

      expect(isValidSourceBook(book)).toBe(false);
    });

    it('should return false for missing description', () => {
      const book = {
        id: '9781234567890',
        title: 'No Description Book',
        authors: ['Author'],
      };

      expect(isValidSourceBook(book)).toBe(false);
    });

    it('should return false for non-string description', () => {
      const book = {
        id: '9781234567890',
        title: 'Numeric Description Book',
        authors: ['Author'],
        description: 12345,
      };

      expect(isValidSourceBook(book)).toBe(false);
    });

    it('should return true for empty description (edge case)', () => {
      const book = {
        id: '9781234567890',
        title: 'Empty Description Book',
        authors: ['Author'],
        description: '',
      };

      // Empty string is valid - the domain layer will handle validation
      expect(isValidSourceBook(book)).toBe(true);
    });

    it('should return true for book with empty tags array', () => {
      const book = {
        id: '9781234567890',
        title: 'Empty Tags Book',
        authors: ['Author'],
        description: 'Description',
        tags: [],
      };

      expect(isValidSourceBook(book)).toBe(true);
    });

    it('should return true for book without tags', () => {
      const book = {
        id: '9781234567890',
        title: 'No Tags Book',
        authors: ['Author'],
        description: 'Description',
      };

      expect(isValidSourceBook(book)).toBe(true);
    });
  });

  describe('ConsolidatedBook type structure', () => {
    it('should have correct readonly properties preserving source and adding type/format', () => {
      const book: ConsolidatedBook = {
        id: '9781234567890',
        title: 'Test Book',
        authors: ['Author'],
        description: 'Description',
        language: 'en',
        level: 'Intermediate',
        pages: '250',
        publication_date: 'January 2024',
        tags: ['Category'],
        type: 'technical',
        format: 'epub',
      };

      // Type check - these should compile
      // Original SourceBook properties preserved
      expect(book.id).toBe('9781234567890');
      expect(book.title).toBe('Test Book');
      expect(book.authors).toEqual(['Author']);
      expect(book.description).toBe('Description');
      expect(book.language).toBe('en');
      expect(book.level).toBe('Intermediate');
      expect(book.pages).toBe('250');
      expect(book.publication_date).toBe('January 2024');
      expect(book.tags).toEqual(['Category']);
      // Added properties
      expect(book.type).toBe('technical');
      expect(book.format).toBe('epub');
    });

    it('should work with minimal source book properties', () => {
      const book: ConsolidatedBook = {
        id: '9780987654321',
        title: 'Minimal Book',
        authors: ['Author'],
        description: 'A description',
        type: 'technical',
        format: 'epub',
      };

      expect(book.id).toBe('9780987654321');
      expect(book.title).toBe('Minimal Book');
      expect(book.type).toBe('technical');
      expect(book.format).toBe('epub');
      // Optional properties are undefined
      expect(book.language).toBeUndefined();
      expect(book.tags).toBeUndefined();
    });
  });

  describe('getExistingIsbns', () => {
    it('should return set of existing ISBNs from database', async () => {
      // Mock database that returns books with ISBNs
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockResolvedValue([
          { isbn: '9781234567890' },
          { isbn: '9780987654321' },
          { isbn: null },  // Book without ISBN
        ]),
      };

      const result = await getExistingIsbns(mockDb as any);

      expect(result).toBeInstanceOf(Set);
      expect(result.size).toBe(2);
      expect(result.has('9781234567890')).toBe(true);
      expect(result.has('9780987654321')).toBe(true);
      expect(result.has(null as any)).toBe(false);
    });

    it('should return empty set when no books exist', async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockResolvedValue([]),
      };

      const result = await getExistingIsbns(mockDb as any);

      expect(result).toBeInstanceOf(Set);
      expect(result.size).toBe(0);
    });

    it('should filter out null ISBNs', async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockResolvedValue([
          { isbn: null },
          { isbn: null },
        ]),
      };

      const result = await getExistingIsbns(mockDb as any);

      expect(result.size).toBe(0);
    });

    it('should handle database with only null ISBNs', async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockResolvedValue([
          { isbn: null },
        ]),
      };

      const result = await getExistingIsbns(mockDb as any);

      expect(result).toBeInstanceOf(Set);
      expect(result.size).toBe(0);
    });
  });
});
