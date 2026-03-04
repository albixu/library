import { describe, it, expect } from 'vitest';
import { BookIdentifier, InvalidBookIdentifierError } from '../../../../src/domain/value-objects/BookIdentifier.js';

describe('BookIdentifier', () => {
  // Valid standard ISBNs
  const VALID_ISBN_10 = '0306406152';
  const VALID_ISBN_10_WITH_X = '080442957X';
  const VALID_ISBN_13 = '9780306406157';
  const VALID_ISBN_13_ALT = '9780132350884';

  // Valid non-standard identifiers found in real catalog data
  const VALID_MIT_ALPHANUMERIC = '53863MIT61304';
  const VALID_SHORT_CODE = '750004';
  const VALID_SHORT_CODE_NUMERIC = '56203';
  const VALID_INSTITUTIONAL_CODE = '00120090001SI';
  const VALID_MIXED_CODE = '30000LTI00073';

  describe('create', () => {
    describe('standard ISBN-13 (numeric)', () => {
      it('should create a valid ISBN-13', () => {
        const id = BookIdentifier.create(VALID_ISBN_13);
        expect(id.value).toBe(VALID_ISBN_13);
      });

      it('should create ISBN-13 with hyphens (strips them)', () => {
        const id = BookIdentifier.create('978-0-306-40615-7');
        expect(id.value).toBe('9780306406157');
      });

      it('should create ISBN-13 with spaces (strips them)', () => {
        const id = BookIdentifier.create('978 0 306 40615 7');
        expect(id.value).toBe('9780306406157');
      });

      it('should create ISBN-13 with mixed separators', () => {
        const id = BookIdentifier.create('978-0 306-40615 7');
        expect(id.value).toBe('9780306406157');
      });

      it('should accept ISBN-13 with invalid checksum', () => {
        // Previously rejected, now accepted as a generic identifier
        expect(() => BookIdentifier.create('9780306406158')).not.toThrow();
        expect(() => BookIdentifier.create('9780240812939')).not.toThrow();
      });
    });

    describe('standard ISBN-10 (numeric)', () => {
      it('should create a valid ISBN-10', () => {
        const id = BookIdentifier.create(VALID_ISBN_10);
        expect(id.value).toBe(VALID_ISBN_10);
      });

      it('should create ISBN-10 ending with X', () => {
        const id = BookIdentifier.create(VALID_ISBN_10_WITH_X);
        expect(id.value).toBe(VALID_ISBN_10_WITH_X);
      });

      it('should normalize lowercase x to uppercase X', () => {
        const id = BookIdentifier.create('080442957x');
        expect(id.value).toBe('080442957X');
      });

      it('should create ISBN-10 with hyphens (strips them)', () => {
        const id = BookIdentifier.create('0-306-40615-2');
        expect(id.value).toBe('0306406152');
      });

      it('should accept ISBN-10 with invalid checksum', () => {
        // Previously rejected, now accepted as a generic identifier
        expect(() => BookIdentifier.create('0783442119')).not.toThrow();
        expect(() => BookIdentifier.create('0321427610')).not.toThrow();
      });
    });

    describe('non-standard alphanumeric identifiers', () => {
      it('should accept MIT Sloan alphanumeric identifier', () => {
        const id = BookIdentifier.create(VALID_MIT_ALPHANUMERIC);
        expect(id.value).toBe(VALID_MIT_ALPHANUMERIC);
      });

      it('should accept short numeric code', () => {
        const id = BookIdentifier.create(VALID_SHORT_CODE);
        expect(id.value).toBe(VALID_SHORT_CODE);
      });

      it('should accept short 5-digit code', () => {
        const id = BookIdentifier.create(VALID_SHORT_CODE_NUMERIC);
        expect(id.value).toBe(VALID_SHORT_CODE_NUMERIC);
      });

      it('should accept institutional code ending in letters', () => {
        const id = BookIdentifier.create(VALID_INSTITUTIONAL_CODE);
        expect(id.value).toBe(VALID_INSTITUTIONAL_CODE);
      });

      it('should accept mixed alphanumeric code', () => {
        const id = BookIdentifier.create(VALID_MIXED_CODE);
        expect(id.value).toBe(VALID_MIXED_CODE);
      });

      it('should accept identifier with hyphens (stripped as separators)', () => {
        // Hyphens are treated as separators (like in ISBN) and stripped during normalization
        const id = BookIdentifier.create('MIT-SLOAN-2024-001');
        expect(id.value).toBe('MITSLOAN2024001');
      });

      it('should accept identifier with underscores', () => {
        const id = BookIdentifier.create('BOOK_2024_001');
        expect(id.value).toBe('BOOK_2024_001');
      });

      it('should accept single character identifier', () => {
        const id = BookIdentifier.create('A');
        expect(id.value).toBe('A');
      });

      it('should accept 32 character identifier (max length)', () => {
        const id = BookIdentifier.create('A'.repeat(32));
        expect(id.value).toBe('A'.repeat(32));
      });

      it('should normalize to uppercase', () => {
        const id = BookIdentifier.create('abc123def');
        expect(id.value).toBe('ABC123DEF');
      });
    });

    describe('invalid identifiers', () => {
      it('should throw for empty string', () => {
        expect(() => BookIdentifier.create('')).toThrow(InvalidBookIdentifierError);
      });

      it('should throw for whitespace only', () => {
        expect(() => BookIdentifier.create('   ')).toThrow(InvalidBookIdentifierError);
      });

      it('should throw for identifier longer than 32 characters', () => {
        expect(() => BookIdentifier.create('A'.repeat(33))).toThrow(InvalidBookIdentifierError);
      });

      it('should throw for identifier with special characters', () => {
        expect(() => BookIdentifier.create('ISBN@2024')).toThrow(InvalidBookIdentifierError);
        expect(() => BookIdentifier.create('978.030.640.615')).toThrow(InvalidBookIdentifierError);
        expect(() => BookIdentifier.create('book#001')).toThrow(InvalidBookIdentifierError);
      });

      it('should throw with descriptive error message', () => {
        try {
          BookIdentifier.create('INVALID IDENTIFIER!');
          expect.fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(InvalidBookIdentifierError);
          expect((error as Error).message).toContain('Invalid book identifier');
          expect((error as Error).message).toContain('1-32 alphanumeric characters');
        }
      });
    });
  });

  describe('fromPersistence', () => {
    it('should create BookIdentifier without validation', () => {
      const id = BookIdentifier.fromPersistence('9780306406157');
      expect(id.value).toBe('9780306406157');
    });

    it('should create BookIdentifier from non-standard identifier without validation', () => {
      const id = BookIdentifier.fromPersistence('53863MIT61304');
      expect(id.value).toBe('53863MIT61304');
    });
  });

  describe('equals', () => {
    it('should return true for identifiers with same value', () => {
      const id1 = BookIdentifier.create(VALID_ISBN_13);
      const id2 = BookIdentifier.create(VALID_ISBN_13);
      expect(id1.equals(id2)).toBe(true);
    });

    it('should return true for identifiers that normalize to same value', () => {
      const id1 = BookIdentifier.create('abc123');
      const id2 = BookIdentifier.create('ABC123');
      expect(id1.equals(id2)).toBe(true);
    });

    it('should return false for different identifiers', () => {
      const id1 = BookIdentifier.create(VALID_ISBN_13);
      const id2 = BookIdentifier.create(VALID_ISBN_13_ALT);
      expect(id1.equals(id2)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return the normalized string value', () => {
      const id = BookIdentifier.create('978-0-306-40615-7');
      expect(id.toString()).toBe('9780306406157');
    });

    it('should return uppercase for alphanumeric identifiers', () => {
      const id = BookIdentifier.create('53863mit61304');
      expect(id.toString()).toBe('53863MIT61304');
    });
  });

  describe('immutability', () => {
    it('should be frozen', () => {
      const id = BookIdentifier.create(VALID_ISBN_13);
      expect(Object.isFrozen(id)).toBe(true);
    });

    it('should not allow property modification', () => {
      const id = BookIdentifier.create(VALID_ISBN_13);
      expect(() => {
        // @ts-expect-error - Testing runtime immutability
        id.value = '1234567890123';
      }).toThrow();
    });
  });

  describe('real-world identifier examples', () => {
    const realIdentifiers = [
      { id: '978-0-13-235088-4', name: 'Clean Code (ISBN-13)' },
      { id: '978-0-201-63361-0', name: 'Design Patterns (ISBN-13)' },
      { id: '978-0-596-51774-8', name: 'JavaScript: The Good Parts (ISBN-13)' },
      { id: '0-201-63361-2', name: 'Design Patterns (ISBN-10)' },
      { id: '53863MIT61304', name: 'MIT Sloan article' },
      { id: '00120090001SI', name: 'Institutional code SI' },
      { id: '750004', name: 'Short numeric code' },
      { id: '30000LTI00073', name: 'LTI mixed code' },
      { id: '9780240812939', name: 'ISBN-13 with bad checksum' },
      { id: '0783442119', name: 'ISBN-10 with bad checksum' },
    ];

    for (const { id, name } of realIdentifiers) {
      it(`should accept real-world identifier: ${name}`, () => {
        expect(() => BookIdentifier.create(id)).not.toThrow();
      });
    }
  });
});
