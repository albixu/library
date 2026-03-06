import { describe, it, expect } from 'vitest';
import {
  BookFormat,
  BOOK_FORMATS,
  InvalidBookFormatError,
} from '../../../../src/domain/value-objects/BookFormat.js';

describe('BookFormat', () => {
  describe('create', () => {
    it('should create a valid BookFormat for each allowed format', () => {
      for (const format of BOOK_FORMATS) {
        const bookFormat = BookFormat.create(format);
        expect(bookFormat.value).toBe(format);
      }
    });

    it('should normalize input to lowercase', () => {
      const bookFormat = BookFormat.create('PDF');
      expect(bookFormat.value).toBe('pdf');
    });

    it('should trim whitespace from input', () => {
      const bookFormat = BookFormat.create('  epub  ');
      expect(bookFormat.value).toBe('epub');
    });

    it('should handle mixed case with whitespace', () => {
      const bookFormat = BookFormat.create('  MoBi  ');
      expect(bookFormat.value).toBe('mobi');
    });

    it('should throw InvalidBookFormatError for invalid format', () => {
      expect(() => BookFormat.create('invalid')).toThrow(InvalidBookFormatError);
    });

    it('should throw InvalidBookFormatError with descriptive message', () => {
      try {
        BookFormat.create('doc');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidBookFormatError);
        expect((error as Error).message).toContain('doc');
        expect((error as Error).message).toContain('Valid formats are');
      }
    });

    it('should throw for empty string', () => {
      expect(() => BookFormat.create('')).toThrow(InvalidBookFormatError);
    });

    it('should throw for whitespace-only string', () => {
      expect(() => BookFormat.create('   ')).toThrow(InvalidBookFormatError);
    });
  });

  describe('fromPersistence', () => {
    it('should create BookFormat without validation', () => {
      const bookFormat = BookFormat.fromPersistence('pdf');
      expect(bookFormat.value).toBe('pdf');
    });
  });

  describe('isValid', () => {
    it('should return true for valid formats', () => {
      expect(BookFormat.isValid('epub')).toBe(true);
      expect(BookFormat.isValid('pdf')).toBe(true);
      expect(BookFormat.isValid('mobi')).toBe(true);
      expect(BookFormat.isValid('azw3')).toBe(true);
    });

    it('should return false for invalid formats', () => {
      expect(BookFormat.isValid('invalid')).toBe(false);
      expect(BookFormat.isValid('PDF')).toBe(false); // Case sensitive
      expect(BookFormat.isValid('')).toBe(false);
    });
  });

  describe('getAllFormats', () => {
    it('should return all valid book formats', () => {
      const formats = BookFormat.getAllFormats();
      expect(formats).toEqual(BOOK_FORMATS);
      expect(formats.length).toBeGreaterThan(0);
    });

    it('should return a readonly array', () => {
      const formats = BookFormat.getAllFormats();
      // TypeScript enforces readonly at compile time via 'as const'
      // At runtime, we verify it returns the expected constant array
      expect(formats).toBe(BOOK_FORMATS);
      expect(formats.length).toBeGreaterThan(0);
    });
  });

  describe('equals', () => {
    it('should return true for BookFormats with same value', () => {
      const format1 = BookFormat.create('pdf');
      const format2 = BookFormat.create('pdf');
      expect(format1.equals(format2)).toBe(true);
    });

    it('should return false for BookFormats with different values', () => {
      const format1 = BookFormat.create('pdf');
      const format2 = BookFormat.create('epub');
      expect(format1.equals(format2)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return the string value', () => {
      const bookFormat = BookFormat.create('epub');
      expect(bookFormat.toString()).toBe('epub');
    });
  });

  describe('immutability', () => {
    it('should be frozen', () => {
      const bookFormat = BookFormat.create('pdf');
      expect(Object.isFrozen(bookFormat)).toBe(true);
    });

    it('should not allow property modification', () => {
      const bookFormat = BookFormat.create('pdf');
      expect(() => {
        // @ts-expect-error - Testing runtime immutability
        bookFormat.value = 'epub';
      }).toThrow();
    });
  });
});
