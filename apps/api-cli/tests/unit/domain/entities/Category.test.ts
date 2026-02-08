import { describe, it, expect, beforeEach } from 'vitest';
import {
  Category,
  type CreateCategoryProps,
  type CategoryPersistenceProps,
} from '../../../../src/domain/entities/Category.js';
import {
  RequiredFieldError,
  FieldTooLongError,
  InvalidUUIDError,
} from '../../../../src/domain/errors/DomainErrors.js';

describe('Category', () => {
  const validUUID = '550e8400-e29b-41d4-a716-446655440000';

  const createValidCategoryProps = (
    overrides?: Partial<CreateCategoryProps>
  ): CreateCategoryProps => ({
    id: validUUID,
    name: 'programming',
    ...overrides,
  });

  const createValidPersistenceProps = (
    overrides?: Partial<CategoryPersistenceProps>
  ): CategoryPersistenceProps => ({
    id: validUUID,
    name: 'programming',
    description: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  });

  describe('create', () => {
    it('should create a valid Category with required fields', () => {
      const props = createValidCategoryProps();
      const category = Category.create(props);

      expect(category.id).toBe(validUUID);
      expect(category.name).toBe('programming');
      expect(category.description).toBeNull();
    });

    it('should create a Category with description', () => {
      const props = createValidCategoryProps({
        description: 'Books about software development',
      });

      const category = Category.create(props);

      expect(category.description).toBe('Books about software development');
    });

    it('should trim whitespace from name', () => {
      const props = createValidCategoryProps({
        name: '  Programming  ',
      });

      const category = Category.create(props);

      expect(category.name).toBe('programming');
    });

    it('should normalize name to lowercase', () => {
      const props = createValidCategoryProps({
        name: 'PROGRAMMING',
      });

      const category = Category.create(props);
      expect(category.name).toBe('programming');
    });

    it('should trim whitespace from description', () => {
      const props = createValidCategoryProps({
        description: '  Some description  ',
      });

      const category = Category.create(props);

      expect(category.description).toBe('Some description');
    });

    it('should set createdAt and updatedAt to now if not provided', () => {
      const before = new Date();
      const category = Category.create(createValidCategoryProps());
      const after = new Date();

      expect(category.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(category.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
      expect(category.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(category.updatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should use provided createdAt and updatedAt', () => {
      const createdAt = new Date('2024-01-01');
      const updatedAt = new Date('2024-06-15');

      const category = Category.create(createValidCategoryProps({ createdAt, updatedAt }));

      expect(category.createdAt).toEqual(createdAt);
      expect(category.updatedAt).toEqual(updatedAt);
    });

    describe('validation errors', () => {
      describe('id', () => {
        it('should throw RequiredFieldError for empty id', () => {
          expect(() => Category.create(createValidCategoryProps({ id: '' }))).toThrow(
            RequiredFieldError
          );
        });

        it('should throw InvalidUUIDError for invalid UUID format', () => {
          expect(() =>
            Category.create(createValidCategoryProps({ id: 'not-a-uuid' }))
          ).toThrow(InvalidUUIDError);
        });

        it('should throw InvalidUUIDError for UUID v1 (not v4)', () => {
          expect(() =>
            Category.create(
              createValidCategoryProps({ id: '550e8400-e29b-11d4-a716-446655440000' })
            )
          ).toThrow(InvalidUUIDError);
        });
      });

      describe('name', () => {
        it('should throw RequiredFieldError for empty name', () => {
          expect(() => Category.create(createValidCategoryProps({ name: '' }))).toThrow(
            RequiredFieldError
          );
        });

        it('should throw RequiredFieldError for whitespace-only name', () => {
          expect(() =>
            Category.create(createValidCategoryProps({ name: '   ' }))
          ).toThrow(RequiredFieldError);
        });

        it('should throw FieldTooLongError for name exceeding 100 chars', () => {
          const longName = 'A'.repeat(101);
          expect(() =>
            Category.create(createValidCategoryProps({ name: longName }))
          ).toThrow(FieldTooLongError);
        });

        it('should accept name with exactly 100 chars', () => {
          const maxName = 'a'.repeat(100);
          const category = Category.create(createValidCategoryProps({ name: maxName }));
          expect(category.name).toBe(maxName);
        });
      });

      describe('description', () => {
        it('should throw FieldTooLongError for description exceeding 500 chars', () => {
          const longDescription = 'A'.repeat(501);
          expect(() =>
            Category.create(createValidCategoryProps({ description: longDescription }))
          ).toThrow(FieldTooLongError);
        });

        it('should accept null description', () => {
          const category = Category.create(createValidCategoryProps({ description: null }));
          expect(category.description).toBeNull();
        });

        it('should accept description with exactly 500 chars', () => {
          const maxDescription = 'A'.repeat(500);
          const category = Category.create(
            createValidCategoryProps({ description: maxDescription })
          );
          expect(category.description).toBe(maxDescription);
        });
      });
    });
  });

  describe('fromPersistence', () => {
    it('should reconstruct a Category without validation', () => {
      const props = createValidPersistenceProps();
      const category = Category.fromPersistence(props);

      expect(category.id).toBe(validUUID);
      expect(category.name).toBe('programming');
      expect(category.description).toBeNull();
    });

    it('should reconstruct a Category with all fields', () => {
      const props = createValidPersistenceProps({
        description: 'A great category',
      });

      const category = Category.fromPersistence(props);

      expect(category.description).toBe('A great category');
    });
  });

  describe('update', () => {
    let category: Category;

    beforeEach(() => {
      category = Category.create(createValidCategoryProps());
    });

    it('should return a new Category instance', () => {
      const updated = category.update({ name: 'new name' });
      expect(updated).not.toBe(category);
    });

    it('should update name', () => {
      const updated = category.update({ name: 'New Name' });
      expect(updated.name).toBe('new name'); // Normalized to lowercase
      expect(category.name).toBe('programming'); // Original unchanged
    });

    it('should update description', () => {
      const updated = category.update({ description: 'New description' });
      expect(updated.description).toBe('New description');
    });

    it('should set description to null', () => {
      const categoryWithDesc = Category.create(
        createValidCategoryProps({ description: 'Some description' })
      );
      const updated = categoryWithDesc.update({ description: null });
      expect(updated.description).toBeNull();
    });

    it('should update multiple fields at once', () => {
      const updated = category.update({
        name: 'New Category',
        description: 'New Description',
      });

      expect(updated.name).toBe('new category');
      expect(updated.description).toBe('New Description');
    });

    it('should preserve unchanged fields', () => {
      const categoryWithDesc = Category.create(
        createValidCategoryProps({ description: 'Original description' })
      );
      const updated = categoryWithDesc.update({ name: 'New Name' });

      expect(updated.description).toBe('Original description');
    });

    it('should preserve id and createdAt', () => {
      const updated = category.update({ name: 'New Name' });

      expect(updated.id).toBe(category.id);
      expect(updated.createdAt).toEqual(category.createdAt);
    });

    it('should update updatedAt timestamp', () => {
      const before = new Date();
      const updated = category.update({ name: 'New Name' });
      const after = new Date();

      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(updated.updatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should validate updated fields', () => {
      expect(() => category.update({ name: '' })).toThrow(RequiredFieldError);
    });
  });

  describe('equals', () => {
    it('should return true for Categories with same id', () => {
      const category1 = Category.create(createValidCategoryProps());
      const category2 = Category.create(createValidCategoryProps({ name: 'different' }));

      expect(category1.equals(category2)).toBe(true);
    });

    it('should return false for Categories with different ids', () => {
      const category1 = Category.create(createValidCategoryProps());
      const category2 = Category.create(
        createValidCategoryProps({ id: '660e8400-e29b-41d4-a716-446655440000' })
      );

      expect(category1.equals(category2)).toBe(false);
    });
  });

  describe('immutability', () => {
    it('should be frozen', () => {
      const category = Category.create(createValidCategoryProps());
      expect(Object.isFrozen(category)).toBe(true);
    });

    it('should not allow property modification', () => {
      const category = Category.create(createValidCategoryProps());
      expect(() => {
        // @ts-expect-error - Testing runtime immutability
        category.name = 'New Name';
      }).toThrow();
    });
  });
});
