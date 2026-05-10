import { describe, it, expect } from 'vitest';
import { BookId } from '../../../../src/domain/book/value-objects/BookId.js';
import { InvalidUUIDError } from '../../../../src/domain/errors/DomainErrors.js';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

describe('BookId', () => {
  describe('create', () => {
    it('should create a BookId from a valid UUID', () => {
      const bookId = BookId.create(VALID_UUID);
      expect(bookId.value).toBe(VALID_UUID);
    });

    it('should trim whitespace before validation', () => {
      const bookId = BookId.create(`  ${VALID_UUID}  `);
      expect(bookId.value).toBe(VALID_UUID);
    });

    it('should throw InvalidUUIDError for an empty string', () => {
      expect(() => BookId.create('')).toThrow(InvalidUUIDError);
    });

    it('should throw InvalidUUIDError for whitespace-only string', () => {
      expect(() => BookId.create('   ')).toThrow(InvalidUUIDError);
    });

    it('should throw InvalidUUIDError for a non-UUID string', () => {
      expect(() => BookId.create('not-a-uuid')).toThrow(InvalidUUIDError);
    });
  });

  describe('generate', () => {
    it('should generate a valid UUID', () => {
      const bookId = BookId.generate();
      expect(bookId.value).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('should generate unique ids', () => {
      const id1 = BookId.generate();
      const id2 = BookId.generate();
      expect(id1.value).not.toBe(id2.value);
    });
  });

  describe('fromPersistence', () => {
    it('should create a BookId from a trusted value without validation', () => {
      const bookId = BookId.fromPersistence(VALID_UUID);
      expect(bookId.value).toBe(VALID_UUID);
    });
  });

  describe('equals', () => {
    it('should return true for two BookIds with the same value', () => {
      const id1 = BookId.fromPersistence(VALID_UUID);
      const id2 = BookId.fromPersistence(VALID_UUID);
      expect(id1.equals(id2)).toBe(true);
    });

    it('should return false for two BookIds with different values', () => {
      const id1 = BookId.generate();
      const id2 = BookId.generate();
      expect(id1.equals(id2)).toBe(false);
    });
  });

  describe('immutability', () => {
    it('should be frozen', () => {
      const bookId = BookId.create(VALID_UUID);
      expect(Object.isFrozen(bookId)).toBe(true);
    });
  });

  describe('toString', () => {
    it('should return the UUID string', () => {
      const bookId = BookId.fromPersistence(VALID_UUID);
      expect(bookId.toString()).toBe(VALID_UUID);
    });
  });
});
