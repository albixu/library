import { describe, it, expect } from 'vitest';
import { UserId } from '../../../../../src/domain/user/value-objects/UserId.js';
import { InvalidUUIDError } from '../../../../../src/domain/errors/DomainErrors.js';

describe('UserId', () => {
  describe('create', () => {
    describe('valid UUIDs', () => {
      it('should create a UserId from a valid UUID v4', () => {
        const uuid = '550e8400-e29b-41d4-a716-446655440000';
        const userId = UserId.create(uuid);
        expect(userId.value).toBe(uuid);
      });

      it('should create a UserId from another valid UUID v4', () => {
        const uuid = '123e4567-e89b-42d3-a456-426614174000';
        const userId = UserId.create(uuid);
        expect(userId.value).toBe(uuid);
      });
    });

    describe('invalid UUIDs', () => {
      it('should throw InvalidUUIDError for an empty string', () => {
        expect(() => UserId.create('')).toThrow(InvalidUUIDError);
      });

      it('should throw InvalidUUIDError for a non-UUID string', () => {
        expect(() => UserId.create('not-a-uuid')).toThrow(InvalidUUIDError);
      });

      it('should throw InvalidUUIDError for a UUID v1 (not v4)', () => {
        expect(() => UserId.create('550e8400-e29b-11d4-a716-446655440000')).toThrow(InvalidUUIDError);
      });

      it('should throw InvalidUUIDError for a UUID without hyphens', () => {
        expect(() => UserId.create('550e8400e29b41d4a716446655440000')).toThrow(InvalidUUIDError);
      });
    });
  });

  describe('generate', () => {
    it('should generate a new valid UserId', () => {
      const userId = UserId.generate();
      expect(userId.value).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('should generate unique UserIds each time', () => {
      const id1 = UserId.generate();
      const id2 = UserId.generate();
      expect(id1.value).not.toBe(id2.value);
    });
  });

  describe('fromPersistence', () => {
    it('should create UserId from persistence without validation', () => {
      const userId = UserId.fromPersistence('any-stored-id');
      expect(userId.value).toBe('any-stored-id');
    });
  });

  describe('equals', () => {
    it('should return true for two UserIds with the same value', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const id1 = UserId.create(uuid);
      const id2 = UserId.create(uuid);
      expect(id1.equals(id2)).toBe(true);
    });

    it('should return false for two UserIds with different values', () => {
      const id1 = UserId.generate();
      const id2 = UserId.generate();
      expect(id1.equals(id2)).toBe(false);
    });
  });

  describe('immutability', () => {
    it('should be frozen (immutable)', () => {
      const userId = UserId.generate();
      expect(Object.isFrozen(userId)).toBe(true);
    });
  });

  describe('toString', () => {
    it('should return the UUID string', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const userId = UserId.create(uuid);
      expect(userId.toString()).toBe(uuid);
    });
  });
});
