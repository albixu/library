/**
 * Unit tests for seed-database.ts script
 */

import { describe, it, expect } from 'vitest';
import {
  toCreateBookInput,
  isValidConsolidatedBook,
  type ConsolidatedBook,
} from '../../../scripts/seed-database.js';

describe('seed-database', () => {
  describe('isValidConsolidatedBook', () => {
    it('should return true for valid consolidated book with all fields', () => {
      const book = {
        isbn: '9781234567890',
        title: 'Test Book',
        authors: ['Author One'],
        description: 'A test description',
        type: 'technical',
        categories: ['JavaScript', 'TypeScript'],
        format: 'pdf',
        available: false,
      };

      expect(isValidConsolidatedBook(book)).toBe(true);
    });

    it('should return true for valid book with multiple authors', () => {
      const book = {
        isbn: '9781234567890',
        title: 'Multi Author Book',
        authors: ['Author 1', 'Author 2', 'Author 3'],
        description: 'Description',
        type: 'technical',
        categories: ['Category1'],
        format: 'pdf',
        available: true,
      };

      expect(isValidConsolidatedBook(book)).toBe(true);
    });

    it('should return true for book with empty categories', () => {
      const book = {
        isbn: '9781234567890',
        title: 'No Categories Book',
        authors: ['Author'],
        description: 'Description',
        type: 'technical',
        categories: [],
        format: 'pdf',
        available: false,
      };

      expect(isValidConsolidatedBook(book)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isValidConsolidatedBook(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isValidConsolidatedBook(undefined)).toBe(false);
    });

    it('should return false for primitive values', () => {
      expect(isValidConsolidatedBook('string')).toBe(false);
      expect(isValidConsolidatedBook(123)).toBe(false);
      expect(isValidConsolidatedBook(true)).toBe(false);
    });

    it('should return false for missing isbn', () => {
      const book = {
        title: 'No ISBN Book',
        authors: ['Author'],
        description: 'Description',
        type: 'technical',
        categories: [],
        format: 'pdf',
        available: false,
      };

      expect(isValidConsolidatedBook(book)).toBe(false);
    });

    it('should return false for non-string isbn', () => {
      const book = {
        isbn: 12345,
        title: 'Numeric ISBN Book',
        authors: ['Author'],
        description: 'Description',
        type: 'technical',
        categories: [],
        format: 'pdf',
        available: false,
      };

      expect(isValidConsolidatedBook(book)).toBe(false);
    });

    it('should return false for missing title', () => {
      const book = {
        isbn: '9781234567890',
        authors: ['Author'],
        description: 'Description',
        type: 'technical',
        categories: [],
        format: 'pdf',
        available: false,
      };

      expect(isValidConsolidatedBook(book)).toBe(false);
    });

    it('should return false for non-string title', () => {
      const book = {
        isbn: '9781234567890',
        title: 123,
        authors: ['Author'],
        description: 'Description',
        type: 'technical',
        categories: [],
        format: 'pdf',
        available: false,
      };

      expect(isValidConsolidatedBook(book)).toBe(false);
    });

    it('should return false for missing authors', () => {
      const book = {
        isbn: '9781234567890',
        title: 'No Authors Book',
        description: 'Description',
        type: 'technical',
        categories: [],
        format: 'pdf',
        available: false,
      };

      expect(isValidConsolidatedBook(book)).toBe(false);
    });

    it('should return false for empty authors array', () => {
      const book = {
        isbn: '9781234567890',
        title: 'Empty Authors Book',
        authors: [],
        description: 'Description',
        type: 'technical',
        categories: [],
        format: 'pdf',
        available: false,
      };

      expect(isValidConsolidatedBook(book)).toBe(false);
    });

    it('should return false for non-array authors', () => {
      const book = {
        isbn: '9781234567890',
        title: 'String Author Book',
        authors: 'Single Author',
        description: 'Description',
        type: 'technical',
        categories: [],
        format: 'pdf',
        available: false,
      };

      expect(isValidConsolidatedBook(book)).toBe(false);
    });

    it('should return false for authors with non-string elements', () => {
      const book = {
        isbn: '9781234567890',
        title: 'Mixed Authors Book',
        authors: ['Valid Author', 123],
        description: 'Description',
        type: 'technical',
        categories: [],
        format: 'pdf',
        available: false,
      };

      expect(isValidConsolidatedBook(book)).toBe(false);
    });

    it('should return false for missing description', () => {
      const book = {
        isbn: '9781234567890',
        title: 'No Description Book',
        authors: ['Author'],
        type: 'technical',
        categories: [],
        format: 'pdf',
        available: false,
      };

      expect(isValidConsolidatedBook(book)).toBe(false);
    });

    it('should return false for non-string description', () => {
      const book = {
        isbn: '9781234567890',
        title: 'Numeric Description Book',
        authors: ['Author'],
        description: 12345,
        type: 'technical',
        categories: [],
        format: 'pdf',
        available: false,
      };

      expect(isValidConsolidatedBook(book)).toBe(false);
    });

    it('should return false for missing type', () => {
      const book = {
        isbn: '9781234567890',
        title: 'No Type Book',
        authors: ['Author'],
        description: 'Description',
        categories: [],
        format: 'pdf',
        available: false,
      };

      expect(isValidConsolidatedBook(book)).toBe(false);
    });

    it('should return false for non-string type', () => {
      const book = {
        isbn: '9781234567890',
        title: 'Numeric Type Book',
        authors: ['Author'],
        description: 'Description',
        type: 123,
        categories: [],
        format: 'pdf',
        available: false,
      };

      expect(isValidConsolidatedBook(book)).toBe(false);
    });

    it('should return false for missing categories', () => {
      const book = {
        isbn: '9781234567890',
        title: 'No Categories Book',
        authors: ['Author'],
        description: 'Description',
        type: 'technical',
        format: 'pdf',
        available: false,
      };

      expect(isValidConsolidatedBook(book)).toBe(false);
    });

    it('should return false for non-array categories', () => {
      const book = {
        isbn: '9781234567890',
        title: 'String Categories Book',
        authors: ['Author'],
        description: 'Description',
        type: 'technical',
        categories: 'Category',
        format: 'pdf',
        available: false,
      };

      expect(isValidConsolidatedBook(book)).toBe(false);
    });

    it('should return false for categories with non-string elements', () => {
      const book = {
        isbn: '9781234567890',
        title: 'Mixed Categories Book',
        authors: ['Author'],
        description: 'Description',
        type: 'technical',
        categories: ['Valid', 123],
        format: 'pdf',
        available: false,
      };

      expect(isValidConsolidatedBook(book)).toBe(false);
    });

    it('should return false for missing format', () => {
      const book = {
        isbn: '9781234567890',
        title: 'No Format Book',
        authors: ['Author'],
        description: 'Description',
        type: 'technical',
        categories: [],
        available: false,
      };

      expect(isValidConsolidatedBook(book)).toBe(false);
    });

    it('should return false for non-string format', () => {
      const book = {
        isbn: '9781234567890',
        title: 'Numeric Format Book',
        authors: ['Author'],
        description: 'Description',
        type: 'technical',
        categories: [],
        format: 123,
        available: false,
      };

      expect(isValidConsolidatedBook(book)).toBe(false);
    });

    it('should return false for missing available', () => {
      const book = {
        isbn: '9781234567890',
        title: 'No Available Book',
        authors: ['Author'],
        description: 'Description',
        type: 'technical',
        categories: [],
        format: 'pdf',
      };

      expect(isValidConsolidatedBook(book)).toBe(false);
    });

    it('should return false for non-boolean available', () => {
      const book = {
        isbn: '9781234567890',
        title: 'String Available Book',
        authors: ['Author'],
        description: 'Description',
        type: 'technical',
        categories: [],
        format: 'pdf',
        available: 'yes',
      };

      expect(isValidConsolidatedBook(book)).toBe(false);
    });
  });

  describe('toCreateBookInput', () => {
    it('should convert consolidated book to CreateBookInput', () => {
      const book: ConsolidatedBook = {
        isbn: '9781234567890',
        title: 'Test Book',
        authors: ['Author One', 'Author Two'],
        description: 'A test description',
        type: 'technical',
        categories: ['JavaScript', 'TypeScript'],
        format: 'pdf',
        available: false,
      };

      const result = toCreateBookInput(book);

      expect(result.title).toBe('Test Book');
      expect(result.author).toBe('Author One'); // First author
      expect(result.description).toBe('A test description');
      expect(result.type).toBe('technical');
      expect(result.categoryNames).toEqual(['JavaScript', 'TypeScript']);
      expect(result.format).toBe('pdf');
      expect(result.isbn).toBe('9781234567890');
      expect(result.available).toBe(false);
      expect(result.path).toBeNull();
    });

    it('should use first author from authors array', () => {
      const book: ConsolidatedBook = {
        isbn: '9781234567890',
        title: 'Multi Author Book',
        authors: ['First Author', 'Second Author', 'Third Author'],
        description: 'Description',
        type: 'technical',
        categories: [],
        format: 'pdf',
        available: false,
      };

      const result = toCreateBookInput(book);

      expect(result.author).toBe('First Author');
    });

    it('should set path to null', () => {
      const book: ConsolidatedBook = {
        isbn: '9781234567890',
        title: 'Test Book',
        authors: ['Author'],
        description: 'Description',
        type: 'technical',
        categories: [],
        format: 'pdf',
        available: true,
      };

      const result = toCreateBookInput(book);

      expect(result.path).toBeNull();
    });

    it('should preserve available true value', () => {
      const book: ConsolidatedBook = {
        isbn: '9781234567890',
        title: 'Available Book',
        authors: ['Author'],
        description: 'Description',
        type: 'technical',
        categories: [],
        format: 'epub',
        available: true,
      };

      const result = toCreateBookInput(book);

      expect(result.available).toBe(true);
    });

    it('should convert categories to categoryNames', () => {
      const book: ConsolidatedBook = {
        isbn: '9781234567890',
        title: 'Categorized Book',
        authors: ['Author'],
        description: 'Description',
        type: 'technical',
        categories: ['Cat1', 'Cat2', 'Cat3'],
        format: 'pdf',
        available: false,
      };

      const result = toCreateBookInput(book);

      expect(result.categoryNames).toEqual(['Cat1', 'Cat2', 'Cat3']);
    });

    it('should handle empty categories', () => {
      const book: ConsolidatedBook = {
        isbn: '9781234567890',
        title: 'No Categories Book',
        authors: ['Author'],
        description: 'Description',
        type: 'novel',
        categories: [],
        format: 'pdf',
        available: false,
      };

      const result = toCreateBookInput(book);

      expect(result.categoryNames).toEqual([]);
    });

    it('should preserve different format values', () => {
      const formats = ['pdf', 'epub', 'mobi'];
      
      for (const format of formats) {
        const book: ConsolidatedBook = {
          isbn: '9781234567890',
          title: 'Test Book',
          authors: ['Author'],
          description: 'Description',
          type: 'technical',
          categories: [],
          format,
          available: false,
        };

        const result = toCreateBookInput(book);
        expect(result.format).toBe(format);
      }
    });

    it('should preserve different type values', () => {
      const types = ['technical', 'novel', 'biography'];
      
      for (const type of types) {
        const book: ConsolidatedBook = {
          isbn: '9781234567890',
          title: 'Test Book',
          authors: ['Author'],
          description: 'Description',
          type,
          categories: [],
          format: 'pdf',
          available: false,
        };

        const result = toCreateBookInput(book);
        expect(result.type).toBe(type);
      }
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

      // Type check - these should compile and have correct values
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
