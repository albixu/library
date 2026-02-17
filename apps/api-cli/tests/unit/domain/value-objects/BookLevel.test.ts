import { describe, it, expect } from 'vitest';
import {
  BookLevel,
  BOOK_LEVELS,
  InvalidBookLevelError,
} from '../../../../src/domain/value-objects/BookLevel.js';

describe('BookLevel', () => {
  describe('create', () => {
    it('should create a valid BookLevel for each allowed level', () => {
      for (const level of BOOK_LEVELS) {
        const bookLevel = BookLevel.create(level);
        expect(bookLevel.value).toBe(level);
      }
    });

    it('should create BookLevel with exact case match', () => {
      const bookLevel = BookLevel.create('Beginner');
      expect(bookLevel.value).toBe('Beginner');
    });

    it('should create BookLevel with compound level', () => {
      const bookLevel = BookLevel.create('Beginner to Intermediate');
      expect(bookLevel.value).toBe('Beginner to Intermediate');
    });

    it('should throw InvalidBookLevelError for lowercase input', () => {
      expect(() => BookLevel.create('beginner')).toThrow(InvalidBookLevelError);
    });

    it('should throw InvalidBookLevelError for uppercase input', () => {
      expect(() => BookLevel.create('BEGINNER')).toThrow(InvalidBookLevelError);
    });

    it('should throw InvalidBookLevelError for invalid level', () => {
      expect(() => BookLevel.create('Expert')).toThrow(InvalidBookLevelError);
    });

    it('should throw InvalidBookLevelError with descriptive message', () => {
      try {
        BookLevel.create('invalid');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidBookLevelError);
        expect((error as Error).message).toContain('invalid');
        expect((error as Error).message).toContain('Valid levels are');
        expect((error as Error).message).toContain('Beginner');
        expect((error as Error).message).toContain('Intermediate to Advanced');
      }
    });

    it('should throw for empty string', () => {
      expect(() => BookLevel.create('')).toThrow(InvalidBookLevelError);
    });

    it('should throw for whitespace-only string', () => {
      expect(() => BookLevel.create('   ')).toThrow(InvalidBookLevelError);
    });

    it('should not normalize case - case sensitive validation', () => {
      // Ensure lowercase versions throw
      expect(() => BookLevel.create('intermediate')).toThrow(InvalidBookLevelError);
      expect(() => BookLevel.create('advanced')).toThrow(InvalidBookLevelError);
    });

    it('should reject values with leading/trailing whitespace', () => {
      // We require exact match, so whitespace should cause failure
      expect(() => BookLevel.create('  Beginner  ')).toThrow(InvalidBookLevelError);
    });
  });

  describe('fromPersistence', () => {
    it('should create BookLevel without validation', () => {
      const bookLevel = BookLevel.fromPersistence('Beginner');
      expect(bookLevel.value).toBe('Beginner');
    });

    it('should create compound levels from persistence', () => {
      const bookLevel = BookLevel.fromPersistence('Intermediate to Advanced');
      expect(bookLevel.value).toBe('Intermediate to Advanced');
    });
  });

  describe('isValid', () => {
    it('should return true for valid levels', () => {
      expect(BookLevel.isValid('Beginner')).toBe(true);
      expect(BookLevel.isValid('Intermediate')).toBe(true);
      expect(BookLevel.isValid('Advanced')).toBe(true);
      expect(BookLevel.isValid('Beginner to Intermediate')).toBe(true);
      expect(BookLevel.isValid('Intermediate to Advanced')).toBe(true);
    });

    it('should return false for invalid levels', () => {
      expect(BookLevel.isValid('invalid')).toBe(false);
      expect(BookLevel.isValid('Expert')).toBe(false);
      expect(BookLevel.isValid('')).toBe(false);
    });

    it('should return false for wrong case', () => {
      expect(BookLevel.isValid('beginner')).toBe(false);
      expect(BookLevel.isValid('BEGINNER')).toBe(false);
      expect(BookLevel.isValid('ADVANCED')).toBe(false);
    });
  });

  describe('getAllLevels', () => {
    it('should return all valid book levels', () => {
      const levels = BookLevel.getAllLevels();
      expect(levels).toEqual(BOOK_LEVELS);
      expect(levels.length).toBe(5);
    });

    it('should return levels in expected order', () => {
      const levels = BookLevel.getAllLevels();
      expect(levels[0]).toBe('Beginner');
      expect(levels[1]).toBe('Intermediate');
      expect(levels[2]).toBe('Advanced');
      expect(levels[3]).toBe('Beginner to Intermediate');
      expect(levels[4]).toBe('Intermediate to Advanced');
    });

    it('should return a readonly array', () => {
      const levels = BookLevel.getAllLevels();
      expect(levels).toBe(BOOK_LEVELS);
    });
  });

  describe('equals', () => {
    it('should return true for BookLevels with same value', () => {
      const level1 = BookLevel.create('Beginner');
      const level2 = BookLevel.create('Beginner');
      expect(level1.equals(level2)).toBe(true);
    });

    it('should return true for compound levels with same value', () => {
      const level1 = BookLevel.create('Beginner to Intermediate');
      const level2 = BookLevel.create('Beginner to Intermediate');
      expect(level1.equals(level2)).toBe(true);
    });

    it('should return false for BookLevels with different values', () => {
      const level1 = BookLevel.create('Beginner');
      const level2 = BookLevel.create('Advanced');
      expect(level1.equals(level2)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return the string value', () => {
      const bookLevel = BookLevel.create('Intermediate');
      expect(bookLevel.toString()).toBe('Intermediate');
    });

    it('should return compound level as string', () => {
      const bookLevel = BookLevel.create('Intermediate to Advanced');
      expect(bookLevel.toString()).toBe('Intermediate to Advanced');
    });
  });

  describe('immutability', () => {
    it('should be frozen', () => {
      const bookLevel = BookLevel.create('Beginner');
      expect(Object.isFrozen(bookLevel)).toBe(true);
    });

    it('should not allow property modification', () => {
      const bookLevel = BookLevel.create('Beginner');
      expect(() => {
        // @ts-expect-error - Testing runtime immutability
        bookLevel.value = 'Advanced';
      }).toThrow();
    });
  });
});
