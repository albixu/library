/**
 * Unit tests for consolidate-books.ts script
 */

import { describe, it, expect } from 'vitest';
import {
  transformBook,
  isValidSourceBook,
  type SourceBook,
  type ConsolidatedBook,
} from '../../../scripts/consolidate-books.js';

describe('consolidate-books', () => {
  describe('transformBook', () => {
    it('should transform a source book to consolidated format', () => {
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

      expect(result.isbn).toBe('9781234567890');
      expect(result.title).toBe('Test Book');
      expect(result.authors).toEqual(['Author One', 'Author Two']);
      expect(result.description).toBe('A test description');
      expect(result.type).toBe('technical');
      expect(result.categories).toEqual(['JavaScript', 'TypeScript']);
      expect(result.format).toBe('pdf');
      expect(result.available).toBe(false);
    });

    it('should map id to isbn', () => {
      const source: SourceBook = {
        id: '0987654321098',
        title: 'Another Book',
        authors: ['Some Author'],
        description: 'Description here',
      };

      const result = transformBook(source);

      expect(result.isbn).toBe('0987654321098');
    });

    it('should map tags to categories', () => {
      const source: SourceBook = {
        id: '1111111111111',
        title: 'Tagged Book',
        authors: ['Author'],
        description: 'Has tags',
        tags: ['Category1', 'Category2', 'Category3'],
      };

      const result = transformBook(source);

      expect(result.categories).toEqual(['Category1', 'Category2', 'Category3']);
    });

    it('should set empty categories when tags is undefined', () => {
      const source: SourceBook = {
        id: '2222222222222',
        title: 'No Tags Book',
        authors: ['Author'],
        description: 'No tags here',
      };

      const result = transformBook(source);

      expect(result.categories).toEqual([]);
    });

    it('should set empty categories when tags is empty array', () => {
      const source: SourceBook = {
        id: '3333333333333',
        title: 'Empty Tags Book',
        authors: ['Author'],
        description: 'Empty tags',
        tags: [],
      };

      const result = transformBook(source);

      expect(result.categories).toEqual([]);
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

    it('should always set format to pdf', () => {
      const source: SourceBook = {
        id: '5555555555555',
        title: 'Any Book',
        authors: ['Author'],
        description: 'Any description',
      };

      const result = transformBook(source);

      expect(result.format).toBe('pdf');
    });

    it('should always set available to false', () => {
      const source: SourceBook = {
        id: '6666666666666',
        title: 'Any Book',
        authors: ['Author'],
        description: 'Any description',
      };

      const result = transformBook(source);

      expect(result.available).toBe(false);
    });

    it('should ignore language field', () => {
      const source: SourceBook = {
        id: '7777777777777',
        language: 'es',
        title: 'Spanish Book',
        authors: ['Autor'],
        description: 'Descripción',
      };

      const result = transformBook(source);

      expect(result).not.toHaveProperty('language');
    });

    it('should ignore level field', () => {
      const source: SourceBook = {
        id: '8888888888888',
        level: 'Advanced',
        title: 'Advanced Book',
        authors: ['Expert Author'],
        description: 'Expert content',
      };

      const result = transformBook(source);

      expect(result).not.toHaveProperty('level');
    });

    it('should ignore pages field', () => {
      const source: SourceBook = {
        id: '9999999999999',
        pages: '500',
        title: 'Long Book',
        authors: ['Prolific Author'],
        description: 'Lots of content',
      };

      const result = transformBook(source);

      expect(result).not.toHaveProperty('pages');
    });

    it('should ignore publication_date field', () => {
      const source: SourceBook = {
        id: '1010101010101',
        publication_date: 'March 2025',
        title: 'Future Book',
        authors: ['Time Traveler'],
        description: 'Future content',
      };

      const result = transformBook(source);

      expect(result).not.toHaveProperty('publication_date');
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
    it('should have correct readonly properties', () => {
      const book: ConsolidatedBook = {
        isbn: '9781234567890',
        title: 'Test Book',
        authors: ['Author'],
        description: 'Description',
        type: 'technical',
        categories: ['Category'],
        format: 'pdf',
        available: false,
      };

      // Type check - these should compile
      expect(book.isbn).toBe('9781234567890');
      expect(book.title).toBe('Test Book');
      expect(book.authors).toEqual(['Author']);
      expect(book.description).toBe('Description');
      expect(book.type).toBe('technical');
      expect(book.categories).toEqual(['Category']);
      expect(book.format).toBe('pdf');
      expect(book.available).toBe(false);
    });
  });
});
