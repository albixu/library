import { describe, it, expect, beforeEach } from 'vitest';
import {
  BookType,
  type CreateBookTypeProps,
  type BookTypePersistenceProps,
  DEFAULT_BOOK_TYPES,
} from '../../../../src/domain/entities/BookType.js';
import {
  RequiredFieldError,
  FieldTooLongError,
  InvalidUUIDError,
} from '../../../../src/domain/errors/DomainErrors.js';

describe('BookType', () => {
  const validUUID = '550e8400-e29b-41d4-a716-446655440000';

  const createValidBookTypeProps = (
    overrides?: Partial<CreateBookTypeProps>
  ): CreateBookTypeProps => ({
    id: validUUID,
    name: 'technical',
    ...overrides,
  });

  const createValidPersistenceProps = (
    overrides?: Partial<BookTypePersistenceProps>
  ): BookTypePersistenceProps => ({
    id: validUUID,
    name: 'technical',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  });

  describe('DEFAULT_BOOK_TYPES', () => {
    it('should include technical, novel, and biography', () => {
      expect(DEFAULT_BOOK_TYPES).toContain('technical');
      expect(DEFAULT_BOOK_TYPES).toContain('novel');
      expect(DEFAULT_BOOK_TYPES).toContain('biography');
    });

    it('should have exactly 3 default types', () => {
      expect(DEFAULT_BOOK_TYPES).toHaveLength(3);
    });
  });

  describe('create', () => {
    it('should create a valid BookType with required fields', () => {
      const props = createValidBookTypeProps();
      const bookType = BookType.create(props);

      expect(bookType.id).toBe(validUUID);
      expect(bookType.name).toBe('technical');
    });

    it('should trim whitespace from name', () => {
      const props = createValidBookTypeProps({
        name: '  technical  ',
      });

      const bookType = BookType.create(props);

      expect(bookType.name).toBe('technical');
    });

    it('should normalize name to lowercase', () => {
      const props = createValidBookTypeProps({
        name: 'TECHNICAL',
      });

      const bookType = BookType.create(props);
      expect(bookType.name).toBe('technical');
    });

    it('should set createdAt and updatedAt to now if not provided', () => {
      const before = new Date();
      const bookType = BookType.create(createValidBookTypeProps());
      const after = new Date();

      expect(bookType.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(bookType.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
      expect(bookType.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(bookType.updatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should use provided createdAt and updatedAt', () => {
      const createdAt = new Date('2024-01-01');
      const updatedAt = new Date('2024-06-15');

      const bookType = BookType.create(createValidBookTypeProps({ createdAt, updatedAt }));

      expect(bookType.createdAt).toEqual(createdAt);
      expect(bookType.updatedAt).toEqual(updatedAt);
    });

    describe('validation errors', () => {
      describe('id', () => {
        it('should throw RequiredFieldError for empty id', () => {
          expect(() => BookType.create(createValidBookTypeProps({ id: '' }))).toThrow(
            RequiredFieldError
          );
        });

        it('should throw RequiredFieldError for whitespace-only id', () => {
          expect(() => BookType.create(createValidBookTypeProps({ id: '   ' }))).toThrow(
            RequiredFieldError
          );
        });

        it('should throw InvalidUUIDError for invalid UUID format', () => {
          expect(() =>
            BookType.create(createValidBookTypeProps({ id: 'not-a-uuid' }))
          ).toThrow(InvalidUUIDError);
        });

        it('should throw InvalidUUIDError for UUID v1 (not v4)', () => {
          expect(() =>
            BookType.create(
              createValidBookTypeProps({ id: '550e8400-e29b-11d4-a716-446655440000' })
            )
          ).toThrow(InvalidUUIDError);
        });
      });

      describe('name', () => {
        it('should throw RequiredFieldError for empty name', () => {
          expect(() => BookType.create(createValidBookTypeProps({ name: '' }))).toThrow(
            RequiredFieldError
          );
        });

        it('should throw RequiredFieldError for whitespace-only name', () => {
          expect(() =>
            BookType.create(createValidBookTypeProps({ name: '   ' }))
          ).toThrow(RequiredFieldError);
        });

        it('should throw FieldTooLongError for name exceeding 50 chars', () => {
          const longName = 'A'.repeat(51);
          expect(() =>
            BookType.create(createValidBookTypeProps({ name: longName }))
          ).toThrow(FieldTooLongError);
        });

        it('should accept name with exactly 50 chars', () => {
          const maxName = 'a'.repeat(50);
          const bookType = BookType.create(createValidBookTypeProps({ name: maxName }));
          expect(bookType.name).toBe(maxName);
        });
      });
    });
  });

  describe('fromPersistence', () => {
    it('should reconstruct a BookType without validation', () => {
      const props = createValidPersistenceProps();
      const bookType = BookType.fromPersistence(props);

      expect(bookType.id).toBe(validUUID);
      expect(bookType.name).toBe('technical');
    });

    it('should reconstruct a BookType with all fields', () => {
      const createdAt = new Date('2024-01-01');
      const updatedAt = new Date('2024-06-15');
      const props = createValidPersistenceProps({
        createdAt,
        updatedAt,
      });

      const bookType = BookType.fromPersistence(props);

      expect(bookType.createdAt).toEqual(createdAt);
      expect(bookType.updatedAt).toEqual(updatedAt);
    });

    it('should not validate when reconstructing from persistence', () => {
      // This should not throw even with "invalid" data
      // because persistence data is trusted
      const props = createValidPersistenceProps({
        name: '', // Empty name would fail validation in create()
      });

      // fromPersistence trusts the data
      const bookType = BookType.fromPersistence(props);
      expect(bookType.name).toBe('');
    });
  });

  describe('update', () => {
    let bookType: BookType;

    beforeEach(() => {
      bookType = BookType.create(createValidBookTypeProps());
    });

    it('should return a new BookType instance', () => {
      const updated = bookType.update({ name: 'novel' });
      expect(updated).not.toBe(bookType);
    });

    it('should update name', () => {
      const updated = bookType.update({ name: 'novel' });
      expect(updated.name).toBe('novel');
      expect(bookType.name).toBe('technical'); // Original unchanged
    });

    it('should trim whitespace from updated name', () => {
      const updated = bookType.update({ name: '  novel  ' });
      expect(updated.name).toBe('novel');
    });

    it('should normalize updated name to lowercase', () => {
      const updated = bookType.update({ name: 'NOVEL' });
      expect(updated.name).toBe('novel');
    });

    it('should preserve id and createdAt', () => {
      const updated = bookType.update({ name: 'novel' });

      expect(updated.id).toBe(bookType.id);
      expect(updated.createdAt).toEqual(bookType.createdAt);
    });

    it('should update updatedAt timestamp', () => {
      const before = new Date();
      const updated = bookType.update({ name: 'novel' });
      const after = new Date();

      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(updated.updatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should validate updated fields', () => {
      expect(() => bookType.update({ name: '' })).toThrow(RequiredFieldError);
    });

    it('should throw FieldTooLongError for name exceeding 50 chars', () => {
      const longName = 'A'.repeat(51);
      expect(() => bookType.update({ name: longName })).toThrow(FieldTooLongError);
    });
  });

  describe('equals', () => {
    it('should return true for BookTypes with same id', () => {
      const bookType1 = BookType.create(createValidBookTypeProps());
      const bookType2 = BookType.create(createValidBookTypeProps({ name: 'novel' }));

      expect(bookType1.equals(bookType2)).toBe(true);
    });

    it('should return false for BookTypes with different ids', () => {
      const bookType1 = BookType.create(createValidBookTypeProps());
      const bookType2 = BookType.create(
        createValidBookTypeProps({ id: '660e8400-e29b-41d4-a716-446655440000' })
      );

      expect(bookType1.equals(bookType2)).toBe(false);
    });
  });

  describe('hasName', () => {
    it('should return true for exact match', () => {
      const bookType = BookType.create(createValidBookTypeProps({ name: 'technical' }));
      expect(bookType.hasName('technical')).toBe(true);
    });

    it('should return true for case-insensitive match', () => {
      const bookType = BookType.create(createValidBookTypeProps({ name: 'technical' }));
      expect(bookType.hasName('TECHNICAL')).toBe(true);
      expect(bookType.hasName('Technical')).toBe(true);
    });

    it('should return false for non-matching name', () => {
      const bookType = BookType.create(createValidBookTypeProps({ name: 'technical' }));
      expect(bookType.hasName('novel')).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return the name', () => {
      const bookType = BookType.create(createValidBookTypeProps({ name: 'technical' }));
      expect(bookType.toString()).toBe('technical');
    });
  });

  describe('immutability', () => {
    it('should be frozen', () => {
      const bookType = BookType.create(createValidBookTypeProps());
      expect(Object.isFrozen(bookType)).toBe(true);
    });

    it('should not allow property modification', () => {
      const bookType = BookType.create(createValidBookTypeProps());
      expect(() => {
        // @ts-expect-error - Testing runtime immutability
        bookType.name = 'novel';
      }).toThrow();
    });
  });
});
