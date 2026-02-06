import { describe, it, expect } from 'vitest';
import {
  BookType,
  BOOK_TYPES,
  InvalidBookTypeError,
} from '../../../../src/domain/value-objects/BookType.js';

describe('BookType', () => {
  describe('create', () => {
    it('should create a valid BookType for each allowed type', () => {
      for (const type of BOOK_TYPES) {
        const bookType = BookType.create(type);
        expect(bookType.value).toBe(type);
      }
    });

    it('should normalize input to lowercase', () => {
      const bookType = BookType.create('TECHNICAL');
      expect(bookType.value).toBe('technical');
    });

    it('should trim whitespace from input', () => {
      const bookType = BookType.create('  novel  ');
      expect(bookType.value).toBe('novel');
    });

    it('should handle mixed case with whitespace', () => {
      const bookType = BookType.create('  EsSaY  ');
      expect(bookType.value).toBe('essay');
    });

    it('should throw InvalidBookTypeError for invalid type', () => {
      expect(() => BookType.create('invalid')).toThrow(InvalidBookTypeError);
    });

    it('should throw InvalidBookTypeError with descriptive message', () => {
      try {
        BookType.create('comics');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidBookTypeError);
        expect((error as Error).message).toContain('comics');
        expect((error as Error).message).toContain('Valid types are');
      }
    });

    it('should throw for empty string', () => {
      expect(() => BookType.create('')).toThrow(InvalidBookTypeError);
    });

    it('should throw for whitespace-only string', () => {
      expect(() => BookType.create('   ')).toThrow(InvalidBookTypeError);
    });
  });

  describe('fromPersistence', () => {
    it('should create BookType without validation', () => {
      const bookType = BookType.fromPersistence('technical');
      expect(bookType.value).toBe('technical');
    });
  });

  describe('isValid', () => {
    it('should return true for valid types', () => {
      expect(BookType.isValid('technical')).toBe(true);
      expect(BookType.isValid('novel')).toBe(true);
      expect(BookType.isValid('essay')).toBe(true);
    });

    it('should return false for invalid types', () => {
      expect(BookType.isValid('invalid')).toBe(false);
      expect(BookType.isValid('TECHNICAL')).toBe(false); // Case sensitive
      expect(BookType.isValid('')).toBe(false);
    });
  });

  describe('getAllTypes', () => {
    it('should return all valid book types', () => {
      const types = BookType.getAllTypes();
      expect(types).toEqual(BOOK_TYPES);
      expect(types.length).toBeGreaterThan(0);
    });

    it('should return a readonly array', () => {
      const types = BookType.getAllTypes();
      // TypeScript enforces readonly at compile time via 'as const'
      // At runtime, we verify it returns the expected constant array
      expect(types).toBe(BOOK_TYPES);
      expect(types.length).toBeGreaterThan(0);
    });
  });

  describe('equals', () => {
    it('should return true for BookTypes with same value', () => {
      const type1 = BookType.create('technical');
      const type2 = BookType.create('technical');
      expect(type1.equals(type2)).toBe(true);
    });

    it('should return false for BookTypes with different values', () => {
      const type1 = BookType.create('technical');
      const type2 = BookType.create('novel');
      expect(type1.equals(type2)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return the string value', () => {
      const bookType = BookType.create('technical');
      expect(bookType.toString()).toBe('technical');
    });
  });

  describe('immutability', () => {
    it('should be frozen', () => {
      const bookType = BookType.create('technical');
      expect(Object.isFrozen(bookType)).toBe(true);
    });

    it('should not allow property modification', () => {
      const bookType = BookType.create('technical');
      expect(() => {
        // @ts-expect-error - Testing runtime immutability
        bookType.value = 'novel';
      }).toThrow();
    });
  });
});
