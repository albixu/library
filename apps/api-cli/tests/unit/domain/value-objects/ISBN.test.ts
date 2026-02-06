import { describe, it, expect } from 'vitest';
import { ISBN, InvalidISBNError } from '../../../../src/domain/value-objects/ISBN.js';

describe('ISBN', () => {
  // Valid ISBN examples for testing
  const VALID_ISBN_10 = '0306406152'; // Valid ISBN-10
  const VALID_ISBN_10_WITH_X = '080442957X'; // Valid ISBN-10 ending in X
  const VALID_ISBN_13 = '9780306406157'; // Valid ISBN-13
  const VALID_ISBN_13_ALT = '9780132350884'; // Clean Code ISBN

  describe('create', () => {
    describe('ISBN-13', () => {
      it('should create a valid ISBN-13', () => {
        const isbn = ISBN.create(VALID_ISBN_13);
        expect(isbn.value).toBe(VALID_ISBN_13);
      });

      it('should create ISBN-13 with hyphens', () => {
        const isbn = ISBN.create('978-0-306-40615-7');
        expect(isbn.value).toBe('9780306406157');
      });

      it('should create ISBN-13 with spaces', () => {
        const isbn = ISBN.create('978 0 306 40615 7');
        expect(isbn.value).toBe('9780306406157');
      });

      it('should create ISBN-13 with mixed separators', () => {
        const isbn = ISBN.create('978-0 306-40615 7');
        expect(isbn.value).toBe('9780306406157');
      });
    });

    describe('ISBN-10', () => {
      it('should create a valid ISBN-10', () => {
        const isbn = ISBN.create(VALID_ISBN_10);
        expect(isbn.value).toBe(VALID_ISBN_10);
      });

      it('should create ISBN-10 ending with X', () => {
        const isbn = ISBN.create(VALID_ISBN_10_WITH_X);
        expect(isbn.value).toBe(VALID_ISBN_10_WITH_X);
      });

      it('should handle lowercase x in ISBN-10', () => {
        const isbn = ISBN.create('080442957x');
        expect(isbn.value).toBe('080442957X');
      });

      it('should create ISBN-10 with hyphens', () => {
        const isbn = ISBN.create('0-306-40615-2');
        expect(isbn.value).toBe('0306406152');
      });
    });

    describe('invalid ISBNs', () => {
      it('should throw for invalid ISBN-13 checksum', () => {
        expect(() => ISBN.create('9780306406158')).toThrow(InvalidISBNError);
      });

      it('should throw for invalid ISBN-10 checksum', () => {
        expect(() => ISBN.create('0306406153')).toThrow(InvalidISBNError);
      });

      it('should throw for wrong length', () => {
        expect(() => ISBN.create('123456789')).toThrow(InvalidISBNError);
        expect(() => ISBN.create('12345678901234')).toThrow(InvalidISBNError);
      });

      it('should throw for non-numeric characters', () => {
        expect(() => ISBN.create('978030640615A')).toThrow(InvalidISBNError);
      });

      it('should throw for X in wrong position (ISBN-10)', () => {
        expect(() => ISBN.create('X306406152')).toThrow(InvalidISBNError);
      });

      it('should throw for X in ISBN-13', () => {
        expect(() => ISBN.create('978030640615X')).toThrow(InvalidISBNError);
      });

      it('should throw for empty string', () => {
        expect(() => ISBN.create('')).toThrow(InvalidISBNError);
      });

      it('should throw with descriptive message', () => {
        try {
          ISBN.create('invalid');
          expect.fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(InvalidISBNError);
          expect((error as Error).message).toContain('invalid');
          expect((error as Error).message).toContain('ISBN-10 or ISBN-13');
        }
      });
    });
  });

  describe('fromPersistence', () => {
    it('should create ISBN without validation', () => {
      const isbn = ISBN.fromPersistence('9780306406157');
      expect(isbn.value).toBe('9780306406157');
    });
  });

  describe('isValid', () => {
    it('should return true for valid ISBN-13', () => {
      expect(ISBN.isValid(VALID_ISBN_13)).toBe(true);
      expect(ISBN.isValid(VALID_ISBN_13_ALT)).toBe(true);
    });

    it('should return true for valid ISBN-10', () => {
      expect(ISBN.isValid(VALID_ISBN_10)).toBe(true);
      expect(ISBN.isValid(VALID_ISBN_10_WITH_X)).toBe(true);
    });

    it('should return true for ISBN with hyphens', () => {
      expect(ISBN.isValid('978-0-306-40615-7')).toBe(true);
      expect(ISBN.isValid('0-306-40615-2')).toBe(true);
    });

    it('should return false for invalid ISBNs', () => {
      expect(ISBN.isValid('invalid')).toBe(false);
      expect(ISBN.isValid('1234567890123')).toBe(false);
      expect(ISBN.isValid('')).toBe(false);
    });
  });

  describe('getType', () => {
    it('should return ISBN-10 for 10-digit ISBN', () => {
      const isbn = ISBN.create(VALID_ISBN_10);
      expect(isbn.getType()).toBe('ISBN-10');
    });

    it('should return ISBN-13 for 13-digit ISBN', () => {
      const isbn = ISBN.create(VALID_ISBN_13);
      expect(isbn.getType()).toBe('ISBN-13');
    });
  });

  describe('toFormattedString', () => {
    it('should format ISBN-13 with hyphens', () => {
      const isbn = ISBN.create(VALID_ISBN_13);
      const formatted = isbn.toFormattedString();
      expect(formatted).toContain('-');
      expect(formatted.replace(/-/g, '')).toBe(VALID_ISBN_13);
    });

    it('should format ISBN-10 with hyphens', () => {
      const isbn = ISBN.create(VALID_ISBN_10);
      const formatted = isbn.toFormattedString();
      expect(formatted).toContain('-');
      expect(formatted.replace(/-/g, '')).toBe(VALID_ISBN_10);
    });
  });

  describe('equals', () => {
    it('should return true for ISBNs with same value', () => {
      const isbn1 = ISBN.create(VALID_ISBN_13);
      const isbn2 = ISBN.create('978-0-306-40615-7'); // Same but with hyphens
      expect(isbn1.equals(isbn2)).toBe(true);
    });

    it('should return false for ISBNs with different values', () => {
      const isbn1 = ISBN.create(VALID_ISBN_13);
      const isbn2 = ISBN.create(VALID_ISBN_13_ALT);
      expect(isbn1.equals(isbn2)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return the normalized string value', () => {
      const isbn = ISBN.create('978-0-306-40615-7');
      expect(isbn.toString()).toBe('9780306406157');
    });
  });

  describe('immutability', () => {
    it('should be frozen', () => {
      const isbn = ISBN.create(VALID_ISBN_13);
      expect(Object.isFrozen(isbn)).toBe(true);
    });

    it('should not allow property modification', () => {
      const isbn = ISBN.create(VALID_ISBN_13);
      expect(() => {
        // @ts-expect-error - Testing runtime immutability
        isbn.value = '1234567890123';
      }).toThrow();
    });
  });

  describe('real-world ISBN examples', () => {
    const realISBNs = [
      { isbn: '978-0-13-235088-4', name: 'Clean Code' },
      { isbn: '978-0-201-63361-0', name: 'Design Patterns' },
      { isbn: '978-0-596-51774-8', name: 'JavaScript: The Good Parts' },
      { isbn: '978-1-492-05172-5', name: 'Learning React 2nd Edition' },
      { isbn: '0-201-63361-2', name: 'Design Patterns (ISBN-10)' },
    ];

    for (const { isbn, name } of realISBNs) {
      it(`should validate real ISBN: ${name}`, () => {
        expect(() => ISBN.create(isbn)).not.toThrow();
      });
    }
  });
});
