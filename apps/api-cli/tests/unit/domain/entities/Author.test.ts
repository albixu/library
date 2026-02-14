import { describe, it, expect, beforeEach } from 'vitest';
import {
  Author,
  type CreateAuthorProps,
  type AuthorPersistenceProps,
} from '../../../../src/domain/entities/Author.js';
import {
  RequiredFieldError,
  FieldTooLongError,
  InvalidUUIDError,
} from '../../../../src/domain/errors/DomainErrors.js';

describe('Author', () => {
  const validUUID = '550e8400-e29b-41d4-a716-446655440000';

  const createValidAuthorProps = (
    overrides?: Partial<CreateAuthorProps>
  ): CreateAuthorProps => ({
    id: validUUID,
    name: 'Robert C. Martin',
    ...overrides,
  });

  const createValidPersistenceProps = (
    overrides?: Partial<AuthorPersistenceProps>
  ): AuthorPersistenceProps => ({
    id: validUUID,
    name: 'Robert C. Martin',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  });

  describe('create', () => {
    it('should create a valid Author with required fields', () => {
      const props = createValidAuthorProps();
      const author = Author.create(props);

      expect(author.id).toBe(validUUID);
      expect(author.name).toBe('Robert C. Martin');
    });

    it('should trim whitespace from name', () => {
      const props = createValidAuthorProps({
        name: '  Robert C. Martin  ',
      });

      const author = Author.create(props);

      expect(author.name).toBe('Robert C. Martin');
    });

    it('should preserve original case of name', () => {
      const props = createValidAuthorProps({
        name: 'Martin FOWLER',
      });

      const author = Author.create(props);
      expect(author.name).toBe('Martin FOWLER');
    });

    it('should set createdAt and updatedAt to now if not provided', () => {
      const before = new Date();
      const author = Author.create(createValidAuthorProps());
      const after = new Date();

      expect(author.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(author.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
      expect(author.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(author.updatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should use provided createdAt and updatedAt', () => {
      const createdAt = new Date('2024-01-01');
      const updatedAt = new Date('2024-06-15');

      const author = Author.create(createValidAuthorProps({ createdAt, updatedAt }));

      expect(author.createdAt).toEqual(createdAt);
      expect(author.updatedAt).toEqual(updatedAt);
    });

    describe('validation errors', () => {
      describe('id', () => {
        it('should throw RequiredFieldError for empty id', () => {
          expect(() => Author.create(createValidAuthorProps({ id: '' }))).toThrow(
            RequiredFieldError
          );
        });

        it('should throw RequiredFieldError for whitespace-only id', () => {
          expect(() => Author.create(createValidAuthorProps({ id: '   ' }))).toThrow(
            RequiredFieldError
          );
        });

        it('should throw InvalidUUIDError for invalid UUID format', () => {
          expect(() =>
            Author.create(createValidAuthorProps({ id: 'not-a-uuid' }))
          ).toThrow(InvalidUUIDError);
        });

        it('should throw InvalidUUIDError for UUID v1 (not v4)', () => {
          expect(() =>
            Author.create(
              createValidAuthorProps({ id: '550e8400-e29b-11d4-a716-446655440000' })
            )
          ).toThrow(InvalidUUIDError);
        });
      });

      describe('name', () => {
        it('should throw RequiredFieldError for empty name', () => {
          expect(() => Author.create(createValidAuthorProps({ name: '' }))).toThrow(
            RequiredFieldError
          );
        });

        it('should throw RequiredFieldError for whitespace-only name', () => {
          expect(() =>
            Author.create(createValidAuthorProps({ name: '   ' }))
          ).toThrow(RequiredFieldError);
        });

        it('should throw FieldTooLongError for name exceeding 300 chars', () => {
          const longName = 'A'.repeat(301);
          expect(() =>
            Author.create(createValidAuthorProps({ name: longName }))
          ).toThrow(FieldTooLongError);
        });

        it('should accept name with exactly 300 chars', () => {
          const maxName = 'A'.repeat(300);
          const author = Author.create(createValidAuthorProps({ name: maxName }));
          expect(author.name).toBe(maxName);
        });
      });
    });
  });

  describe('fromPersistence', () => {
    it('should reconstruct an Author without validation', () => {
      const props = createValidPersistenceProps();
      const author = Author.fromPersistence(props);

      expect(author.id).toBe(validUUID);
      expect(author.name).toBe('Robert C. Martin');
    });

    it('should reconstruct an Author with all fields', () => {
      const createdAt = new Date('2024-01-01');
      const updatedAt = new Date('2024-06-15');
      const props = createValidPersistenceProps({
        createdAt,
        updatedAt,
      });

      const author = Author.fromPersistence(props);

      expect(author.createdAt).toEqual(createdAt);
      expect(author.updatedAt).toEqual(updatedAt);
    });

    it('should not validate when reconstructing from persistence', () => {
      // This should not throw even with "invalid" data
      // because persistence data is trusted
      const props = createValidPersistenceProps({
        name: '', // Empty name would fail validation in create()
      });

      // fromPersistence trusts the data
      const author = Author.fromPersistence(props);
      expect(author.name).toBe('');
    });
  });

  describe('update', () => {
    let author: Author;

    beforeEach(() => {
      author = Author.create(createValidAuthorProps());
    });

    it('should return a new Author instance', () => {
      const updated = author.update({ name: 'New Name' });
      expect(updated).not.toBe(author);
    });

    it('should update name', () => {
      const updated = author.update({ name: 'Martin Fowler' });
      expect(updated.name).toBe('Martin Fowler');
      expect(author.name).toBe('Robert C. Martin'); // Original unchanged
    });

    it('should trim whitespace from updated name', () => {
      const updated = author.update({ name: '  Martin Fowler  ' });
      expect(updated.name).toBe('Martin Fowler');
    });

    it('should preserve id and createdAt', () => {
      const updated = author.update({ name: 'New Name' });

      expect(updated.id).toBe(author.id);
      expect(updated.createdAt).toEqual(author.createdAt);
    });

    it('should update updatedAt timestamp', () => {
      const before = new Date();
      const updated = author.update({ name: 'New Name' });
      const after = new Date();

      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(updated.updatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should validate updated fields', () => {
      expect(() => author.update({ name: '' })).toThrow(RequiredFieldError);
    });

    it('should throw FieldTooLongError for name exceeding 300 chars', () => {
      const longName = 'A'.repeat(301);
      expect(() => author.update({ name: longName })).toThrow(FieldTooLongError);
    });
  });

  describe('equals', () => {
    it('should return true for Authors with same id', () => {
      const author1 = Author.create(createValidAuthorProps());
      const author2 = Author.create(createValidAuthorProps({ name: 'Different Name' }));

      expect(author1.equals(author2)).toBe(true);
    });

    it('should return false for Authors with different ids', () => {
      const author1 = Author.create(createValidAuthorProps());
      const author2 = Author.create(
        createValidAuthorProps({ id: '660e8400-e29b-41d4-a716-446655440000' })
      );

      expect(author1.equals(author2)).toBe(false);
    });
  });

  describe('immutability', () => {
    it('should be frozen', () => {
      const author = Author.create(createValidAuthorProps());
      expect(Object.isFrozen(author)).toBe(true);
    });

    it('should not allow property modification', () => {
      const author = Author.create(createValidAuthorProps());
      expect(() => {
        // @ts-expect-error - Testing runtime immutability
        author.name = 'New Name';
      }).toThrow();
    });
  });
});
