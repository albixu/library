/**
 * Unit tests for seed-database.ts script
 * 
 * Tests the source book validation (isValidSourceBook) and transformation
 * (transformSourceBook) functions that convert from books.json format
 * to internal ConsolidatedBook format.
 */

import { describe, it, expect } from 'vitest';
import {
  toCreateBookInput,
  isValidSourceBook,
  transformSourceBook,
  type SourceBook,
  type ConsolidatedBook,
} from '../../../scripts/seed-database.js';

describe('seed-database', () => {
  describe('isValidSourceBook', () => {
    it('should return true for valid source book with all fields', () => {
      const book = {
        id: '9781234567890',
        title: 'Test Book',
        authors: ['Author One'],
        description: 'A test description',
        language: 'en',
        type: 'technical',
        tags: ['JavaScript', 'TypeScript'],
        format: 'pdf',
      };

      expect(isValidSourceBook(book)).toBe(true);
    });

    it('should return true for valid book with multiple authors', () => {
      const book = {
        id: '9781234567890',
        title: 'Multi Author Book',
        authors: ['Author 1', 'Author 2', 'Author 3'],
        description: 'Description',
        language: 'en',
        type: 'technical',
        tags: ['Category1'],
        format: 'pdf',
      };

      expect(isValidSourceBook(book)).toBe(true);
    });

    it('should return true for book without tags (optional field)', () => {
      const book = {
        id: '9781234567890',
        title: 'No Tags Book',
        authors: ['Author'],
        description: 'Description',
        language: 'es',
        type: 'technical',
        format: 'pdf',
      };

      expect(isValidSourceBook(book)).toBe(true);
    });

    it('should return true for book with empty tags array', () => {
      const book = {
        id: '9781234567890',
        title: 'Empty Tags Book',
        authors: ['Author'],
        description: 'Description',
        language: 'es',
        type: 'technical',
        tags: [],
        format: 'pdf',
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
        language: 'en',
        type: 'technical',
        format: 'pdf',
      };

      expect(isValidSourceBook(book)).toBe(false);
    });

    it('should return false for non-string id', () => {
      const book = {
        id: 12345,
        title: 'Numeric ID Book',
        authors: ['Author'],
        description: 'Description',
        language: 'en',
        type: 'technical',
        format: 'pdf',
      };

      expect(isValidSourceBook(book)).toBe(false);
    });

    it('should return false for missing title', () => {
      const book = {
        id: '9781234567890',
        authors: ['Author'],
        description: 'Description',
        language: 'en',
        type: 'technical',
        format: 'pdf',
      };

      expect(isValidSourceBook(book)).toBe(false);
    });

    it('should return false for non-string title', () => {
      const book = {
        id: '9781234567890',
        title: 123,
        authors: ['Author'],
        description: 'Description',
        language: 'en',
        type: 'technical',
        format: 'pdf',
      };

      expect(isValidSourceBook(book)).toBe(false);
    });

    it('should return false for missing authors', () => {
      const book = {
        id: '9781234567890',
        title: 'No Authors Book',
        description: 'Description',
        language: 'en',
        type: 'technical',
        format: 'pdf',
      };

      expect(isValidSourceBook(book)).toBe(false);
    });

    it('should return false for empty authors array', () => {
      const book = {
        id: '9781234567890',
        title: 'Empty Authors Book',
        authors: [],
        description: 'Description',
        language: 'en',
        type: 'technical',
        format: 'pdf',
      };

      expect(isValidSourceBook(book)).toBe(false);
    });

    it('should return false for non-array authors', () => {
      const book = {
        id: '9781234567890',
        title: 'String Author Book',
        authors: 'Single Author',
        description: 'Description',
        language: 'en',
        type: 'technical',
        format: 'pdf',
      };

      expect(isValidSourceBook(book)).toBe(false);
    });

    it('should return false for authors with non-string elements', () => {
      const book = {
        id: '9781234567890',
        title: 'Mixed Authors Book',
        authors: ['Valid Author', 123],
        description: 'Description',
        language: 'en',
        type: 'technical',
        format: 'pdf',
      };

      expect(isValidSourceBook(book)).toBe(false);
    });

    it('should return false for missing description', () => {
      const book = {
        id: '9781234567890',
        title: 'No Description Book',
        authors: ['Author'],
        language: 'en',
        type: 'technical',
        format: 'pdf',
      };

      expect(isValidSourceBook(book)).toBe(false);
    });

    it('should return false for non-string description', () => {
      const book = {
        id: '9781234567890',
        title: 'Numeric Description Book',
        authors: ['Author'],
        description: 12345,
        language: 'en',
        type: 'technical',
        format: 'pdf',
      };

      expect(isValidSourceBook(book)).toBe(false);
    });

    it('should return false for missing language', () => {
      const book = {
        id: '9781234567890',
        title: 'No Language Book',
        authors: ['Author'],
        description: 'Description',
        type: 'technical',
        format: 'pdf',
      };

      expect(isValidSourceBook(book)).toBe(false);
    });

    it('should return false for non-string language', () => {
      const book = {
        id: '9781234567890',
        title: 'Numeric Language Book',
        authors: ['Author'],
        description: 'Description',
        language: 123,
        type: 'technical',
        format: 'pdf',
      };

      expect(isValidSourceBook(book)).toBe(false);
    });

    it('should return false for missing type', () => {
      const book = {
        id: '9781234567890',
        title: 'No Type Book',
        authors: ['Author'],
        description: 'Description',
        language: 'en',
        format: 'pdf',
      };

      expect(isValidSourceBook(book)).toBe(false);
    });

    it('should return false for non-string type', () => {
      const book = {
        id: '9781234567890',
        title: 'Numeric Type Book',
        authors: ['Author'],
        description: 'Description',
        language: 'en',
        type: 123,
        format: 'pdf',
      };

      expect(isValidSourceBook(book)).toBe(false);
    });

    it('should return false for non-array tags', () => {
      const book = {
        id: '9781234567890',
        title: 'String Tags Book',
        authors: ['Author'],
        description: 'Description',
        language: 'en',
        type: 'technical',
        tags: 'Tag',
        format: 'pdf',
      };

      expect(isValidSourceBook(book)).toBe(false);
    });

    it('should return false for tags with non-string elements', () => {
      const book = {
        id: '9781234567890',
        title: 'Mixed Tags Book',
        authors: ['Author'],
        description: 'Description',
        language: 'en',
        type: 'technical',
        tags: ['Valid', 123],
        format: 'pdf',
      };

      expect(isValidSourceBook(book)).toBe(false);
    });

    it('should return false for missing format', () => {
      const book = {
        id: '9781234567890',
        title: 'No Format Book',
        authors: ['Author'],
        description: 'Description',
        language: 'en',
        type: 'technical',
      };

      expect(isValidSourceBook(book)).toBe(false);
    });

    it('should return false for non-string format', () => {
      const book = {
        id: '9781234567890',
        title: 'Numeric Format Book',
        authors: ['Author'],
        description: 'Description',
        language: 'en',
        type: 'technical',
        format: 123,
      };

      expect(isValidSourceBook(book)).toBe(false);
    });

    it('should return true for book with valid level', () => {
      const book = {
        id: '9781234567890',
        title: 'Book With Level',
        authors: ['Author'],
        description: 'Description',
        language: 'en',
        type: 'technical',
        format: 'pdf',
        level: 'Beginner',
      };

      expect(isValidSourceBook(book)).toBe(true);
    });

    it('should return true for book without level (optional field)', () => {
      const book = {
        id: '9781234567890',
        title: 'Book Without Level',
        authors: ['Author'],
        description: 'Description',
        language: 'en',
        type: 'technical',
        format: 'pdf',
      };

      expect(isValidSourceBook(book)).toBe(true);
    });

    it('should return true for book with null level', () => {
      const book = {
        id: '9781234567890',
        title: 'Book With Null Level',
        authors: ['Author'],
        description: 'Description',
        language: 'en',
        type: 'technical',
        format: 'pdf',
        level: null,
      };

      expect(isValidSourceBook(book)).toBe(true);
    });

    it('should return false for book with non-string level', () => {
      const book = {
        id: '9781234567890',
        title: 'Book With Numeric Level',
        authors: ['Author'],
        description: 'Description',
        language: 'en',
        type: 'technical',
        format: 'pdf',
        level: 123,
      };

      expect(isValidSourceBook(book)).toBe(false);
    });

    it('should allow additional properties (pages, publication_date, etc.)', () => {
      const book = {
        id: '9781234567890',
        title: 'Book With Extra Fields',
        authors: ['Author'],
        description: 'Description',
        language: 'en',
        type: 'technical',
        format: 'pdf',
        pages: '500',
        publication_date: 'June 2024',
        extra_field: 'ignored',
      };

      expect(isValidSourceBook(book)).toBe(true);
    });
  });

  describe('transformSourceBook', () => {
    it('should transform id to isbn', () => {
      const source: SourceBook = {
        id: '9781234567890',
        title: 'Test Book',
        authors: ['Author'],
        description: 'Description',
        language: 'en',
        type: 'technical',
        format: 'pdf',
      };

      const result = transformSourceBook(source);

      expect(result.isbn).toBe('9781234567890');
    });

    it('should transform tags to categories', () => {
      const source: SourceBook = {
        id: '9781234567890',
        title: 'Test Book',
        authors: ['Author'],
        description: 'Description',
        language: 'en',
        type: 'technical',
        tags: ['JavaScript', 'TypeScript'],
        format: 'pdf',
      };

      const result = transformSourceBook(source);

      expect(result.categories).toEqual(['JavaScript', 'TypeScript']);
    });

    it('should set categories to empty array when tags is undefined', () => {
      const source: SourceBook = {
        id: '9781234567890',
        title: 'Test Book',
        authors: ['Author'],
        description: 'Description',
        language: 'en',
        type: 'technical',
        format: 'pdf',
      };

      const result = transformSourceBook(source);

      expect(result.categories).toEqual([]);
    });

    it('should set available to true by default', () => {
      const source: SourceBook = {
        id: '9781234567890',
        title: 'Test Book',
        authors: ['Author'],
        description: 'Description',
        language: 'en',
        type: 'technical',
        format: 'pdf',
      };

      const result = transformSourceBook(source);

      expect(result.available).toBe(true);
    });

    it('should preserve all other fields', () => {
      const source: SourceBook = {
        id: '9781234567890',
        title: 'Test Book',
        authors: ['Author One', 'Author Two'],
        description: 'A test description',
        language: 'es',
        type: 'novel',
        tags: ['Fiction'],
        format: 'epub',
        level: 'Intermediate',
      };

      const result = transformSourceBook(source);

      expect(result.title).toBe('Test Book');
      expect(result.authors).toEqual(['Author One', 'Author Two']);
      expect(result.description).toBe('A test description');
      expect(result.language).toBe('es');
      expect(result.type).toBe('novel');
      expect(result.format).toBe('epub');
      expect(result.level).toBe('Intermediate');
    });

    it('should preserve level when provided', () => {
      const source: SourceBook = {
        id: '9781234567890',
        title: 'Test Book',
        authors: ['Author'],
        description: 'Description',
        language: 'en',
        type: 'technical',
        format: 'pdf',
        level: 'Beginner to intermediate',
      };

      const result = transformSourceBook(source);

      expect(result.level).toBe('Beginner to intermediate');
    });

    it('should set level to undefined when not provided', () => {
      const source: SourceBook = {
        id: '9781234567890',
        title: 'Test Book',
        authors: ['Author'],
        description: 'Description',
        language: 'en',
        type: 'technical',
        format: 'pdf',
      };

      const result = transformSourceBook(source);

      expect(result.level).toBeUndefined();
    });
  });

  describe('toCreateBookInput', () => {
    it('should convert consolidated book to CreateBookInput', () => {
      const book: ConsolidatedBook = {
        isbn: '9781234567890',
        title: 'Test Book',
        authors: ['Author One', 'Author Two'],
        description: 'A test description',
        language: 'en',
        type: 'technical',
        categories: ['JavaScript', 'TypeScript'],
        format: 'pdf',
        available: true,
      };

      const result = toCreateBookInput(book);

      expect(result.title).toBe('Test Book');
      expect(result.authors).toEqual(['Author One', 'Author Two']);
      expect(result.description).toBe('A test description');
      expect(result.language).toBe('en');
      expect(result.type).toBe('technical');
      expect(result.categoryNames).toEqual(['JavaScript', 'TypeScript']);
      expect(result.format).toBe('pdf');
      expect(result.isbn).toBe('9781234567890');
      expect(result.available).toBe(true);
      expect(result.path).toBeNull();
      expect(result.level).toBeNull();
    });

    it('should include level when provided', () => {
      const book: ConsolidatedBook = {
        isbn: '9781234567890',
        title: 'Test Book With Level',
        authors: ['Author'],
        description: 'Description',
        language: 'en',
        type: 'technical',
        categories: [],
        format: 'pdf',
        available: true,
        level: 'Intermediate',
      };

      const result = toCreateBookInput(book);

      expect(result.level).toBe('Intermediate');
    });

    it('should set level to null when not provided', () => {
      const book: ConsolidatedBook = {
        isbn: '9781234567890',
        title: 'Test Book Without Level',
        authors: ['Author'],
        description: 'Description',
        language: 'en',
        type: 'technical',
        categories: [],
        format: 'pdf',
        available: true,
      };

      const result = toCreateBookInput(book);

      expect(result.level).toBeNull();
    });

    it('should pass all authors from authors array', () => {
      const book: ConsolidatedBook = {
        isbn: '9781234567890',
        title: 'Multi Author Book',
        authors: ['First Author', 'Second Author', 'Third Author'],
        description: 'Description',
        language: 'en',
        type: 'technical',
        categories: [],
        format: 'pdf',
        available: true,
      };

      const result = toCreateBookInput(book);

      expect(result.authors).toEqual(['First Author', 'Second Author', 'Third Author']);
    });

    it('should set path to null', () => {
      const book: ConsolidatedBook = {
        isbn: '9781234567890',
        title: 'Test Book',
        authors: ['Author'],
        description: 'Description',
        language: 'en',
        type: 'technical',
        categories: [],
        format: 'pdf',
        available: true,
      };

      const result = toCreateBookInput(book);

      expect(result.path).toBeNull();
    });

    it('should preserve available value', () => {
      const bookAvailable: ConsolidatedBook = {
        isbn: '9781234567890',
        title: 'Available Book',
        authors: ['Author'],
        description: 'Description',
        language: 'en',
        type: 'technical',
        categories: [],
        format: 'epub',
        available: true,
      };

      const bookUnavailable: ConsolidatedBook = {
        isbn: '9781234567891',
        title: 'Unavailable Book',
        authors: ['Author'],
        description: 'Description',
        language: 'en',
        type: 'technical',
        categories: [],
        format: 'epub',
        available: false,
      };

      expect(toCreateBookInput(bookAvailable).available).toBe(true);
      expect(toCreateBookInput(bookUnavailable).available).toBe(false);
    });

    it('should convert categories to categoryNames', () => {
      const book: ConsolidatedBook = {
        isbn: '9781234567890',
        title: 'Categorized Book',
        authors: ['Author'],
        description: 'Description',
        language: 'en',
        type: 'technical',
        categories: ['Cat1', 'Cat2', 'Cat3'],
        format: 'pdf',
        available: true,
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
        language: 'en',
        type: 'novel',
        categories: [],
        format: 'pdf',
        available: true,
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
          language: 'en',
          type: 'technical',
          categories: [],
          format,
          available: true,
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
          language: 'en',
          type,
          categories: [],
          format: 'pdf',
          available: true,
        };

        const result = toCreateBookInput(book);
        expect(result.type).toBe(type);
      }
    });

    it('should handle different language codes', () => {
      const languages = ['en', 'es', 'fr', 'de', 'pt'];
      
      for (const language of languages) {
        const book: ConsolidatedBook = {
          isbn: '9781234567890',
          title: 'Test Book',
          authors: ['Author'],
          description: 'Description',
          language,
          type: 'technical',
          categories: [],
          format: 'pdf',
          available: true,
        };

        const result = toCreateBookInput(book);
        expect(result.language).toBe(language);
      }
    });
  });

  describe('SourceBook and ConsolidatedBook type structures', () => {
    it('should have correct SourceBook structure', () => {
      const source: SourceBook = {
        id: '9781234567890',
        title: 'Test Book',
        authors: ['Author'],
        description: 'Description',
        language: 'en',
        type: 'technical',
        tags: ['Category'],
        format: 'pdf',
        level: 'Beginner',
        pages: '500',
        publication_date: 'June 2024',
      };

      expect(source.id).toBe('9781234567890');
      expect(source.title).toBe('Test Book');
      expect(source.authors).toEqual(['Author']);
      expect(source.description).toBe('Description');
      expect(source.language).toBe('en');
      expect(source.type).toBe('technical');
      expect(source.tags).toEqual(['Category']);
      expect(source.format).toBe('pdf');
      expect(source.level).toBe('Beginner');
      expect(source.pages).toBe('500');
      expect(source.publication_date).toBe('June 2024');
    });

    it('should have correct ConsolidatedBook structure', () => {
      const book: ConsolidatedBook = {
        isbn: '9781234567890',
        title: 'Test Book',
        authors: ['Author'],
        description: 'Description',
        language: 'en',
        type: 'technical',
        categories: ['Category'],
        format: 'pdf',
        available: true,
        level: 'Beginner',
      };

      expect(book.isbn).toBe('9781234567890');
      expect(book.title).toBe('Test Book');
      expect(book.authors).toEqual(['Author']);
      expect(book.description).toBe('Description');
      expect(book.language).toBe('en');
      expect(book.type).toBe('technical');
      expect(book.categories).toEqual(['Category']);
      expect(book.format).toBe('pdf');
      expect(book.available).toBe(true);
      expect(book.level).toBe('Beginner');
    });
  });

  describe('end-to-end transformation', () => {
    it('should correctly transform and convert a real book from books.json format', () => {
      // Simulate a real entry from books.json
      const sourceFromJson = {
        id: '9781394254699',
        language: 'en',
        level: 'Intermediate to advanced',
        title: 'ISC2 CISSP Certified Information Systems Security Professional Official Study Guide',
        authors: ['Mike Chapple', 'James Michael Stewart', 'Darril Gibson'],
        pages: '1200',
        publication_date: 'June 2024',
        description: 'CISSP Study Guide - fully updated for the 2024 CISSP Body of Knowledge',
        tags: ['Security', 'Security Certifications', 'CISSP'],
        type: 'technical',
        format: 'epub',
      };

      // First validate
      expect(isValidSourceBook(sourceFromJson)).toBe(true);

      // Then transform
      const consolidated = transformSourceBook(sourceFromJson as SourceBook);

      expect(consolidated.isbn).toBe('9781394254699');
      expect(consolidated.title).toBe('ISC2 CISSP Certified Information Systems Security Professional Official Study Guide');
      expect(consolidated.authors).toEqual(['Mike Chapple', 'James Michael Stewart', 'Darril Gibson']);
      expect(consolidated.description).toBe('CISSP Study Guide - fully updated for the 2024 CISSP Body of Knowledge');
      expect(consolidated.language).toBe('en');
      expect(consolidated.type).toBe('technical');
      expect(consolidated.categories).toEqual(['Security', 'Security Certifications', 'CISSP']);
      expect(consolidated.format).toBe('epub');
      expect(consolidated.available).toBe(true);
      expect(consolidated.level).toBe('Intermediate to advanced');

      // Finally convert to CreateBookInput
      const input = toCreateBookInput(consolidated);

      expect(input.isbn).toBe('9781394254699');
      expect(input.title).toBe('ISC2 CISSP Certified Information Systems Security Professional Official Study Guide');
      expect(input.authors).toEqual(['Mike Chapple', 'James Michael Stewart', 'Darril Gibson']);
      expect(input.description).toBe('CISSP Study Guide - fully updated for the 2024 CISSP Body of Knowledge');
      expect(input.language).toBe('en');
      expect(input.type).toBe('technical');
      expect(input.categoryNames).toEqual(['Security', 'Security Certifications', 'CISSP']);
      expect(input.format).toBe('epub');
      expect(input.available).toBe(true);
      expect(input.level).toBe('Intermediate to advanced');
      expect(input.path).toBeNull();
    });
  });
});
