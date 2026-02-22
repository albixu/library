import { describe, it, expect, beforeEach } from 'vitest';
import {
  Level,
  type CreateLevelProps,
  type LevelPersistenceProps,
} from '../../../../src/domain/entities/Level.js';
import {
  RequiredFieldError,
  FieldTooLongError,
  InvalidUUIDError,
} from '../../../../src/domain/errors/DomainErrors.js';

describe('Level', () => {
  const validUUID = '550e8400-e29b-41d4-a716-446655440000';

  const createValidLevelProps = (
    overrides?: Partial<CreateLevelProps>
  ): CreateLevelProps => ({
    id: validUUID,
    name: 'Beginner',
    ...overrides,
  });

  const createValidPersistenceProps = (
    overrides?: Partial<LevelPersistenceProps>
  ): LevelPersistenceProps => ({
    id: validUUID,
    name: 'Beginner',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  });

  describe('create', () => {
    it('should create a valid Level with required fields', () => {
      const props = createValidLevelProps();
      const level = Level.create(props);

      expect(level.id).toBe(validUUID);
      expect(level.name).toBe('Beginner');
    });

    it('should trim whitespace from name', () => {
      const props = createValidLevelProps({
        name: '  Intermediate  ',
      });

      const level = Level.create(props);

      expect(level.name).toBe('Intermediate');
    });

    it('should preserve original case of name', () => {
      const props = createValidLevelProps({
        name: 'Beginner to INTERMEDIATE',
      });

      const level = Level.create(props);
      expect(level.name).toBe('Beginner to INTERMEDIATE');
    });

    it('should set createdAt and updatedAt to now if not provided', () => {
      const before = new Date();
      const level = Level.create(createValidLevelProps());
      const after = new Date();

      expect(level.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(level.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
      expect(level.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(level.updatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should use provided createdAt and updatedAt', () => {
      const createdAt = new Date('2024-01-01');
      const updatedAt = new Date('2024-06-15');

      const level = Level.create(createValidLevelProps({ createdAt, updatedAt }));

      expect(level.createdAt).toEqual(createdAt);
      expect(level.updatedAt).toEqual(updatedAt);
    });

    describe('validation errors', () => {
      describe('id', () => {
        it('should throw RequiredFieldError for empty id', () => {
          expect(() => Level.create(createValidLevelProps({ id: '' }))).toThrow(
            RequiredFieldError
          );
        });

        it('should throw RequiredFieldError for whitespace-only id', () => {
          expect(() => Level.create(createValidLevelProps({ id: '   ' }))).toThrow(
            RequiredFieldError
          );
        });

        it('should throw InvalidUUIDError for invalid UUID format', () => {
          expect(() =>
            Level.create(createValidLevelProps({ id: 'not-a-uuid' }))
          ).toThrow(InvalidUUIDError);
        });

        it('should throw InvalidUUIDError for UUID v1 (not v4)', () => {
          expect(() =>
            Level.create(
              createValidLevelProps({ id: '550e8400-e29b-11d4-a716-446655440000' })
            )
          ).toThrow(InvalidUUIDError);
        });
      });

      describe('name', () => {
        it('should throw RequiredFieldError for empty name', () => {
          expect(() => Level.create(createValidLevelProps({ name: '' }))).toThrow(
            RequiredFieldError
          );
        });

        it('should throw RequiredFieldError for whitespace-only name', () => {
          expect(() =>
            Level.create(createValidLevelProps({ name: '   ' }))
          ).toThrow(RequiredFieldError);
        });

        it('should throw FieldTooLongError for name exceeding 100 chars', () => {
          const longName = 'A'.repeat(101);
          expect(() =>
            Level.create(createValidLevelProps({ name: longName }))
          ).toThrow(FieldTooLongError);
        });

        it('should accept name with exactly 100 chars', () => {
          const maxName = 'A'.repeat(100);
          const level = Level.create(createValidLevelProps({ name: maxName }));
          expect(level.name).toBe(maxName);
        });
      });
    });
  });

  describe('fromPersistence', () => {
    it('should reconstruct a Level without validation', () => {
      const props = createValidPersistenceProps();
      const level = Level.fromPersistence(props);

      expect(level.id).toBe(validUUID);
      expect(level.name).toBe('Beginner');
    });

    it('should reconstruct a Level with all fields', () => {
      const createdAt = new Date('2024-01-01');
      const updatedAt = new Date('2024-06-15');
      const props = createValidPersistenceProps({
        createdAt,
        updatedAt,
      });

      const level = Level.fromPersistence(props);

      expect(level.createdAt).toEqual(createdAt);
      expect(level.updatedAt).toEqual(updatedAt);
    });

    it('should not validate when reconstructing from persistence', () => {
      // This should not throw even with "invalid" data
      // because persistence data is trusted
      const props = createValidPersistenceProps({
        name: '', // Empty name would fail validation in create()
      });

      // fromPersistence trusts the data
      const level = Level.fromPersistence(props);
      expect(level.name).toBe('');
    });
  });

  describe('update', () => {
    let level: Level;

    beforeEach(() => {
      level = Level.create(createValidLevelProps());
    });

    it('should return a new Level instance', () => {
      const updated = level.update({ name: 'Advanced' });
      expect(updated).not.toBe(level);
    });

    it('should update name', () => {
      const updated = level.update({ name: 'Advanced' });
      expect(updated.name).toBe('Advanced');
      expect(level.name).toBe('Beginner'); // Original unchanged
    });

    it('should trim whitespace from updated name', () => {
      const updated = level.update({ name: '  Intermediate  ' });
      expect(updated.name).toBe('Intermediate');
    });

    it('should preserve id and createdAt', () => {
      const updated = level.update({ name: 'Advanced' });

      expect(updated.id).toBe(level.id);
      expect(updated.createdAt).toEqual(level.createdAt);
    });

    it('should update updatedAt timestamp', () => {
      const before = new Date();
      const updated = level.update({ name: 'Advanced' });
      const after = new Date();

      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(updated.updatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should validate updated fields', () => {
      expect(() => level.update({ name: '' })).toThrow(RequiredFieldError);
    });

    it('should throw FieldTooLongError for name exceeding 100 chars', () => {
      const longName = 'A'.repeat(101);
      expect(() => level.update({ name: longName })).toThrow(FieldTooLongError);
    });
  });

  describe('equals', () => {
    it('should return true for Levels with same id', () => {
      const level1 = Level.create(createValidLevelProps());
      const level2 = Level.create(createValidLevelProps({ name: 'Different Name' }));

      expect(level1.equals(level2)).toBe(true);
    });

    it('should return false for Levels with different ids', () => {
      const level1 = Level.create(createValidLevelProps());
      const level2 = Level.create(
        createValidLevelProps({ id: '660e8400-e29b-41d4-a716-446655440000' })
      );

      expect(level1.equals(level2)).toBe(false);
    });
  });

  describe('immutability', () => {
    it('should be frozen', () => {
      const level = Level.create(createValidLevelProps());
      expect(Object.isFrozen(level)).toBe(true);
    });

    it('should not allow property modification', () => {
      const level = Level.create(createValidLevelProps());
      expect(() => {
        // @ts-expect-error - Testing runtime immutability
        level.name = 'New Name';
      }).toThrow();
    });
  });
});
