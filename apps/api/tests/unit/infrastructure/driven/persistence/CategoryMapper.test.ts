/**
 * CategoryMapper Unit Tests
 *
 * Tests for the Category entity mapper that converts between
 * domain entities and database records.
 *
 * HU-008: Updated to test typeId field mapping.
 */

import { describe, it, expect } from 'vitest';
import { CategoryMapper } from '../../../../../src/infrastructure/driven/persistence/mappers/CategoryMapper.js';
import { Category } from '../../../../../src/domain/entities/Category.js';
import type { CategorySelect } from '../../../../../src/infrastructure/driven/persistence/drizzle/schema.js';

describe('CategoryMapper', () => {
  // Test fixtures
  const validId = '550e8400-e29b-41d4-a716-446655440001';
  const validId2 = '550e8400-e29b-41d4-a716-446655440002';
  const validTypeId = '660e8400-e29b-41d4-a716-446655440001';
  const validTypeId2 = '660e8400-e29b-41d4-a716-446655440002';
  const createdAt = new Date('2026-01-01T00:00:00Z');
  const updatedAt = new Date('2026-01-15T00:00:00Z');

  const mockDbRecord: CategorySelect = {
    id: validId,
    name: 'Programming',
    typeId: validTypeId,
    description: 'Books about programming',
    createdAt,
    updatedAt,
  };

  const mockDbRecord2: CategorySelect = {
    id: validId2,
    name: 'Fiction',
    typeId: validTypeId2,
    description: null,
    createdAt,
    updatedAt,
  };

  describe('toDomain', () => {
    it('should convert database record to Category entity', () => {
      const result = CategoryMapper.toDomain(mockDbRecord);

      expect(result).toBeInstanceOf(Category);
      expect(result.id).toBe(validId);
      expect(result.name).toBe('Programming');
      expect(result.typeId).toBe(validTypeId);
      expect(result.description).toBe('Books about programming');
      expect(result.createdAt).toEqual(createdAt);
      expect(result.updatedAt).toEqual(updatedAt);
    });

    it('should handle null description', () => {
      const result = CategoryMapper.toDomain(mockDbRecord2);

      expect(result.description).toBeNull();
    });

    it('should include typeId in conversion', () => {
      const result = CategoryMapper.toDomain(mockDbRecord);

      expect(result.typeId).toBe(validTypeId);
    });

    it('should handle different typeIds', () => {
      const result1 = CategoryMapper.toDomain(mockDbRecord);
      const result2 = CategoryMapper.toDomain(mockDbRecord2);

      expect(result1.typeId).toBe(validTypeId);
      expect(result2.typeId).toBe(validTypeId2);
    });

    it('should preserve timestamps exactly', () => {
      const specificCreated = new Date('2025-06-15T10:30:00.000Z');
      const specificUpdated = new Date('2025-12-20T15:45:30.000Z');

      const record: CategorySelect = {
        id: validId,
        name: 'Science',
        typeId: validTypeId,
        description: null,
        createdAt: specificCreated,
        updatedAt: specificUpdated,
      };

      const result = CategoryMapper.toDomain(record);

      expect(result.createdAt.toISOString()).toBe(specificCreated.toISOString());
      expect(result.updatedAt.toISOString()).toBe(specificUpdated.toISOString());
    });

    it('should create immutable Category entity', () => {
      const result = CategoryMapper.toDomain(mockDbRecord);

      expect(Object.isFrozen(result)).toBe(true);
    });
  });

  describe('toPersistence', () => {
    it('should convert Category entity to database insert record', () => {
      const category = Category.fromPersistence({
        id: validId,
        name: 'Programming',
        typeId: validTypeId,
        description: 'Books about programming',
        createdAt,
        updatedAt,
      });

      const result = CategoryMapper.toPersistence(category);

      expect(result.id).toBe(validId);
      expect(result.name).toBe('Programming');
      expect(result.typeId).toBe(validTypeId);
      expect(result.description).toBe('Books about programming');
      expect(result.createdAt).toEqual(createdAt);
      expect(result.updatedAt).toEqual(updatedAt);
    });

    it('should include typeId in persistence record', () => {
      const category = Category.fromPersistence({
        id: validId,
        name: 'Science',
        typeId: validTypeId2,
        description: null,
        createdAt,
        updatedAt,
      });

      const result = CategoryMapper.toPersistence(category);

      expect(result.typeId).toBe(validTypeId2);
    });

    it('should handle null description', () => {
      const category = Category.fromPersistence({
        id: validId,
        name: 'Science',
        typeId: validTypeId,
        description: null,
        createdAt,
        updatedAt,
      });

      const result = CategoryMapper.toPersistence(category);

      expect(result.description).toBeNull();
    });

    it('should preserve all fields when converting to persistence', () => {
      const specificDate = new Date('2025-11-11T11:11:11.000Z');
      const category = Category.fromPersistence({
        id: validId2,
        name: 'History',
        typeId: validTypeId,
        description: 'Historical books',
        createdAt: specificDate,
        updatedAt: specificDate,
      });

      const result = CategoryMapper.toPersistence(category);

      expect(result).toEqual({
        id: validId2,
        name: 'History',
        typeId: validTypeId,
        description: 'Historical books',
        createdAt: specificDate,
        updatedAt: specificDate,
      });
    });

    it('should handle entities created via create method', () => {
      const category = Category.create({
        id: validId,
        name: 'Philosophy',
        typeId: validTypeId,
      });

      const result = CategoryMapper.toPersistence(category);

      expect(result.id).toBe(validId);
      expect(result.name).toBe('philosophy'); // Category normalizes to lowercase
      expect(result.typeId).toBe(validTypeId);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('toDomainList', () => {
    it('should convert empty array to empty array', () => {
      const result = CategoryMapper.toDomainList([]);

      expect(result).toEqual([]);
    });

    it('should convert single record to array with one entity', () => {
      const result = CategoryMapper.toDomainList([mockDbRecord]);

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(Category);
      expect(result[0].id).toBe(validId);
      expect(result[0].typeId).toBe(validTypeId);
    });

    it('should convert multiple records to array of entities', () => {
      const result = CategoryMapper.toDomainList([mockDbRecord, mockDbRecord2]);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Programming');
      expect(result[0].typeId).toBe(validTypeId);
      expect(result[1].name).toBe('Fiction');
      expect(result[1].typeId).toBe(validTypeId2);
    });

    it('should preserve order of records', () => {
      const records = [mockDbRecord2, mockDbRecord];

      const result = CategoryMapper.toDomainList(records);

      expect(result[0].id).toBe(validId2);
      expect(result[1].id).toBe(validId);
    });
  });

  describe('toPersistenceList', () => {
    it('should convert empty array to empty array', () => {
      const result = CategoryMapper.toPersistenceList([]);

      expect(result).toEqual([]);
    });

    it('should convert single entity to array with one record', () => {
      const category = Category.fromPersistence({
        id: validId,
        name: 'Programming',
        typeId: validTypeId,
        description: 'Test',
        createdAt,
        updatedAt,
      });

      const result = CategoryMapper.toPersistenceList([category]);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(validId);
      expect(result[0].typeId).toBe(validTypeId);
    });

    it('should convert multiple entities to array of records', () => {
      const category1 = Category.fromPersistence({
        id: validId,
        name: 'Programming',
        typeId: validTypeId,
        description: null,
        createdAt,
        updatedAt,
      });
      const category2 = Category.fromPersistence({
        id: validId2,
        name: 'Fiction',
        typeId: validTypeId2,
        description: null,
        createdAt,
        updatedAt,
      });

      const result = CategoryMapper.toPersistenceList([category1, category2]);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Programming');
      expect(result[0].typeId).toBe(validTypeId);
      expect(result[1].name).toBe('Fiction');
      expect(result[1].typeId).toBe(validTypeId2);
    });

    it('should preserve order of entities', () => {
      const category1 = Category.fromPersistence({
        id: validId,
        name: 'First',
        typeId: validTypeId,
        description: null,
        createdAt,
        updatedAt,
      });
      const category2 = Category.fromPersistence({
        id: validId2,
        name: 'Second',
        typeId: validTypeId2,
        description: null,
        createdAt,
        updatedAt,
      });

      const result = CategoryMapper.toPersistenceList([category2, category1]);

      expect(result[0].name).toBe('Second');
      expect(result[1].name).toBe('First');
    });
  });

  describe('round-trip conversion', () => {
    it('should preserve data through toDomain -> toPersistence cycle', () => {
      const originalRecord: CategorySelect = {
        id: validId,
        name: 'Technology',
        typeId: validTypeId,
        description: 'Tech books',
        createdAt: new Date('2026-03-15T08:30:00Z'),
        updatedAt: new Date('2026-03-20T14:00:00Z'),
      };

      const entity = CategoryMapper.toDomain(originalRecord);
      const result = CategoryMapper.toPersistence(entity);

      expect(result.id).toBe(originalRecord.id);
      expect(result.name).toBe(originalRecord.name);
      expect(result.typeId).toBe(originalRecord.typeId);
      expect(result.description).toBe(originalRecord.description);
      expect(result.createdAt).toEqual(originalRecord.createdAt);
      expect(result.updatedAt).toEqual(originalRecord.updatedAt);
    });

    it('should preserve data through toPersistence -> toDomain cycle', () => {
      const originalEntity = Category.fromPersistence({
        id: validId2,
        name: 'Science Fiction',
        typeId: validTypeId2,
        description: 'Sci-fi books',
        createdAt: new Date('2026-05-01T00:00:00Z'),
        updatedAt: new Date('2026-05-15T12:00:00Z'),
      });

      const record = CategoryMapper.toPersistence(originalEntity);
      const result = CategoryMapper.toDomain(record);

      expect(result.id).toBe(originalEntity.id);
      expect(result.name).toBe(originalEntity.name);
      expect(result.typeId).toBe(originalEntity.typeId);
      expect(result.description).toBe(originalEntity.description);
      expect(result.createdAt.toISOString()).toBe(originalEntity.createdAt.toISOString());
      expect(result.updatedAt.toISOString()).toBe(originalEntity.updatedAt.toISOString());
    });

    it('should preserve typeId through round-trip conversion', () => {
      const originalRecord: CategorySelect = {
        id: validId,
        name: 'Art',
        typeId: validTypeId2,
        description: null,
        createdAt,
        updatedAt,
      };

      const entity = CategoryMapper.toDomain(originalRecord);
      const result = CategoryMapper.toPersistence(entity);

      expect(result.typeId).toBe(validTypeId2);
    });
  });
});
