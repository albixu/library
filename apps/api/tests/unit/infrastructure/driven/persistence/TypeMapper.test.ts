/**
 * TypeMapper Unit Tests
 *
 * Tests for the BookType entity mapper that converts between
 * domain entities and database records.
 *
 * HU-008: Updated to include levelIds support (N:N relationship with levels).
 */

import { describe, it, expect } from 'vitest';
import { TypeMapper } from '../../../../../src/infrastructure/driven/persistence/mappers/TypeMapper.js';
import type { TypeSelectWithLevels } from '../../../../../src/infrastructure/driven/persistence/mappers/TypeMapper.js';
import { BookType } from '../../../../../src/domain/entities/BookType.js';
import type { TypeSelect } from '../../../../../src/infrastructure/driven/persistence/drizzle/schema.js';

describe('TypeMapper', () => {
  // Test fixtures
  const validId = '550e8400-e29b-41d4-a716-446655440001';
  const validId2 = '550e8400-e29b-41d4-a716-446655440002';
  const levelId1 = '550e8400-e29b-41d4-a716-446655440101';
  const levelId2 = '550e8400-e29b-41d4-a716-446655440102';
  const levelId3 = '550e8400-e29b-41d4-a716-446655440103';
  const createdAt = new Date('2026-01-01T00:00:00Z');
  const updatedAt = new Date('2026-01-15T00:00:00Z');

  const mockDbRecordWithLevels: TypeSelectWithLevels = {
    id: validId,
    name: 'technical',
    createdAt,
    updatedAt,
    levelIds: [levelId1, levelId2],
  };

  const mockDbRecordWithLevels2: TypeSelectWithLevels = {
    id: validId2,
    name: 'novel',
    createdAt,
    updatedAt,
    levelIds: [levelId3],
  };

  const mockDbRecordNoLevels: TypeSelectWithLevels = {
    id: validId,
    name: 'biography',
    createdAt,
    updatedAt,
    levelIds: [],
  };

  describe('toDomain', () => {
    it('should convert database record with levelIds to BookType entity', () => {
      const result = TypeMapper.toDomain(mockDbRecordWithLevels);

      expect(result).toBeInstanceOf(BookType);
      expect(result.id).toBe(validId);
      expect(result.name).toBe('technical');
      expect(result.levelIds).toEqual([levelId1, levelId2]);
      expect(result.createdAt).toEqual(createdAt);
      expect(result.updatedAt).toEqual(updatedAt);
    });

    it('should handle empty levelIds array', () => {
      const result = TypeMapper.toDomain(mockDbRecordNoLevels);

      expect(result.levelIds).toEqual([]);
    });

    it('should handle different type names', () => {
      const result = TypeMapper.toDomain(mockDbRecordWithLevels2);

      expect(result.name).toBe('novel');
      expect(result.levelIds).toEqual([levelId3]);
    });

    it('should preserve timestamps exactly', () => {
      const specificCreated = new Date('2025-06-15T10:30:00.000Z');
      const specificUpdated = new Date('2025-12-20T15:45:30.000Z');

      const record: TypeSelectWithLevels = {
        id: validId,
        name: 'reference',
        createdAt: specificCreated,
        updatedAt: specificUpdated,
        levelIds: [levelId1],
      };

      const result = TypeMapper.toDomain(record);

      expect(result.createdAt.toISOString()).toBe(specificCreated.toISOString());
      expect(result.updatedAt.toISOString()).toBe(specificUpdated.toISOString());
    });

    it('should create immutable BookType entity', () => {
      const result = TypeMapper.toDomain(mockDbRecordWithLevels);

      expect(Object.isFrozen(result)).toBe(true);
    });

    it('should pass levelIds to entity', () => {
      const result = TypeMapper.toDomain(mockDbRecordWithLevels);

      // fromPersistence trusts the data, so levelIds is passed as-is
      // The readonly type prevents modification at compile time
      expect(result.levelIds).toEqual([levelId1, levelId2]);
    });

    it('should handle multiple levelIds', () => {
      const recordWithManyLevels: TypeSelectWithLevels = {
        id: validId,
        name: 'technical',
        createdAt,
        updatedAt,
        levelIds: [levelId1, levelId2, levelId3],
      };

      const result = TypeMapper.toDomain(recordWithManyLevels);

      expect(result.levelIds).toHaveLength(3);
      expect(result.levelIds).toContain(levelId1);
      expect(result.levelIds).toContain(levelId2);
      expect(result.levelIds).toContain(levelId3);
    });
  });

  describe('toPersistence', () => {
    it('should convert BookType entity to database insert record', () => {
      const type = BookType.fromPersistence({
        id: validId,
        name: 'technical',
        levelIds: [levelId1, levelId2],
        createdAt,
        updatedAt,
      });

      const result = TypeMapper.toPersistence(type);

      expect(result.id).toBe(validId);
      expect(result.name).toBe('technical');
      expect(result.createdAt).toEqual(createdAt);
      expect(result.updatedAt).toEqual(updatedAt);
    });

    it('should NOT include levelIds in persistence record (separate junction table)', () => {
      const type = BookType.fromPersistence({
        id: validId,
        name: 'technical',
        levelIds: [levelId1, levelId2],
        createdAt,
        updatedAt,
      });

      const result = TypeMapper.toPersistence(type);

      expect(result).not.toHaveProperty('levelIds');
    });

    it('should preserve all base fields when converting to persistence', () => {
      const specificDate = new Date('2025-11-11T11:11:11.000Z');
      const type = BookType.fromPersistence({
        id: validId2,
        name: 'novel',
        levelIds: [],
        createdAt: specificDate,
        updatedAt: specificDate,
      });

      const result = TypeMapper.toPersistence(type);

      expect(result).toEqual({
        id: validId2,
        name: 'novel',
        createdAt: specificDate,
        updatedAt: specificDate,
      });
    });

    it('should handle entities created via create method', () => {
      const type = BookType.create({
        id: validId,
        name: 'biography',
        levelIds: [levelId1],
      });

      const result = TypeMapper.toPersistence(type);

      expect(result.id).toBe(validId);
      expect(result.name).toBe('biography');
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('toLevelJunctionRecords', () => {
    it('should convert type with levelIds to junction records', () => {
      const type = BookType.fromPersistence({
        id: validId,
        name: 'technical',
        levelIds: [levelId1, levelId2],
        createdAt,
        updatedAt,
      });

      const result = TypeMapper.toLevelJunctionRecords(type);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ typeId: validId, levelId: levelId1 });
      expect(result[1]).toEqual({ typeId: validId, levelId: levelId2 });
    });

    it('should return empty array when type has no levels', () => {
      const type = BookType.fromPersistence({
        id: validId,
        name: 'biography',
        levelIds: [],
        createdAt,
        updatedAt,
      });

      const result = TypeMapper.toLevelJunctionRecords(type);

      expect(result).toEqual([]);
    });

    it('should handle single levelId', () => {
      const type = BookType.fromPersistence({
        id: validId,
        name: 'novel',
        levelIds: [levelId3],
        createdAt,
        updatedAt,
      });

      const result = TypeMapper.toLevelJunctionRecords(type);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ typeId: validId, levelId: levelId3 });
    });

    it('should preserve order of levelIds', () => {
      const type = BookType.fromPersistence({
        id: validId,
        name: 'technical',
        levelIds: [levelId3, levelId1, levelId2],
        createdAt,
        updatedAt,
      });

      const result = TypeMapper.toLevelJunctionRecords(type);

      expect(result[0].levelId).toBe(levelId3);
      expect(result[1].levelId).toBe(levelId1);
      expect(result[2].levelId).toBe(levelId2);
    });

    it('should use correct typeId for all junction records', () => {
      const type = BookType.fromPersistence({
        id: validId2,
        name: 'technical',
        levelIds: [levelId1, levelId2, levelId3],
        createdAt,
        updatedAt,
      });

      const result = TypeMapper.toLevelJunctionRecords(type);

      expect(result.every(r => r.typeId === validId2)).toBe(true);
    });
  });

  describe('toDomainList', () => {
    it('should convert empty array to empty array', () => {
      const result = TypeMapper.toDomainList([]);

      expect(result).toEqual([]);
    });

    it('should convert single record to array with one entity', () => {
      const result = TypeMapper.toDomainList([mockDbRecordWithLevels]);

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(BookType);
      expect(result[0].id).toBe(validId);
      expect(result[0].levelIds).toEqual([levelId1, levelId2]);
    });

    it('should convert multiple records to array of entities', () => {
      const result = TypeMapper.toDomainList([mockDbRecordWithLevels, mockDbRecordWithLevels2]);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('technical');
      expect(result[0].levelIds).toEqual([levelId1, levelId2]);
      expect(result[1].name).toBe('novel');
      expect(result[1].levelIds).toEqual([levelId3]);
    });

    it('should preserve order of records', () => {
      const records = [mockDbRecordWithLevels2, mockDbRecordWithLevels];

      const result = TypeMapper.toDomainList(records);

      expect(result[0].id).toBe(validId2);
      expect(result[1].id).toBe(validId);
    });

    it('should handle records with different levelIds configurations', () => {
      const records = [mockDbRecordWithLevels, mockDbRecordNoLevels, mockDbRecordWithLevels2];

      const result = TypeMapper.toDomainList(records);

      expect(result[0].levelIds).toHaveLength(2);
      expect(result[1].levelIds).toHaveLength(0);
      expect(result[2].levelIds).toHaveLength(1);
    });
  });

  describe('toPersistenceList', () => {
    it('should convert empty array to empty array', () => {
      const result = TypeMapper.toPersistenceList([]);

      expect(result).toEqual([]);
    });

    it('should convert single entity to array with one record', () => {
      const type = BookType.fromPersistence({
        id: validId,
        name: 'technical',
        levelIds: [levelId1],
        createdAt,
        updatedAt,
      });

      const result = TypeMapper.toPersistenceList([type]);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(validId);
      expect(result[0]).not.toHaveProperty('levelIds');
    });

    it('should convert multiple entities to array of records', () => {
      const type1 = BookType.fromPersistence({
        id: validId,
        name: 'technical',
        levelIds: [levelId1],
        createdAt,
        updatedAt,
      });
      const type2 = BookType.fromPersistence({
        id: validId2,
        name: 'novel',
        levelIds: [levelId2, levelId3],
        createdAt,
        updatedAt,
      });

      const result = TypeMapper.toPersistenceList([type1, type2]);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('technical');
      expect(result[1].name).toBe('novel');
    });

    it('should preserve order of entities', () => {
      const type1 = BookType.fromPersistence({
        id: validId,
        name: 'first',
        levelIds: [],
        createdAt,
        updatedAt,
      });
      const type2 = BookType.fromPersistence({
        id: validId2,
        name: 'second',
        levelIds: [],
        createdAt,
        updatedAt,
      });

      const result = TypeMapper.toPersistenceList([type2, type1]);

      expect(result[0].name).toBe('second');
      expect(result[1].name).toBe('first');
    });

    it('should not include levelIds in any persistence records', () => {
      const types = [
        BookType.fromPersistence({ id: validId, name: 'a', levelIds: [levelId1], createdAt, updatedAt }),
        BookType.fromPersistence({ id: validId2, name: 'b', levelIds: [levelId2, levelId3], createdAt, updatedAt }),
      ];

      const result = TypeMapper.toPersistenceList(types);

      result.forEach(record => {
        expect(record).not.toHaveProperty('levelIds');
      });
    });
  });

  describe('round-trip conversion', () => {
    it('should preserve base data through toDomain -> toPersistence cycle', () => {
      const originalRecord: TypeSelectWithLevels = {
        id: validId,
        name: 'technical',
        createdAt: new Date('2026-03-15T08:30:00Z'),
        updatedAt: new Date('2026-03-20T14:00:00Z'),
        levelIds: [levelId1, levelId2],
      };

      const entity = TypeMapper.toDomain(originalRecord);
      const result = TypeMapper.toPersistence(entity);

      expect(result.id).toBe(originalRecord.id);
      expect(result.name).toBe(originalRecord.name);
      expect(result.createdAt).toEqual(originalRecord.createdAt);
      expect(result.updatedAt).toEqual(originalRecord.updatedAt);
    });

    it('should preserve levelIds through domain entity', () => {
      const originalRecord: TypeSelectWithLevels = {
        id: validId,
        name: 'technical',
        createdAt,
        updatedAt,
        levelIds: [levelId1, levelId2, levelId3],
      };

      const entity = TypeMapper.toDomain(originalRecord);
      const junctionRecords = TypeMapper.toLevelJunctionRecords(entity);

      expect(junctionRecords).toHaveLength(3);
      expect(junctionRecords.map(r => r.levelId)).toEqual(originalRecord.levelIds);
    });

    it('should reconstruct levelIds from junction records for toDomain', () => {
      // Simulating what repository does: load type + load junction records
      const typeRecord: TypeSelect = {
        id: validId,
        name: 'technical',
        createdAt,
        updatedAt,
      };
      const junctionLevelIds = [levelId1, levelId2];

      // Repository combines them
      const recordWithLevels: TypeSelectWithLevels = {
        ...typeRecord,
        levelIds: junctionLevelIds,
      };

      const entity = TypeMapper.toDomain(recordWithLevels);

      expect(entity.levelIds).toEqual(junctionLevelIds);
      expect(entity.hasLevel(levelId1)).toBe(true);
      expect(entity.hasLevel(levelId2)).toBe(true);
      expect(entity.hasLevel(levelId3)).toBe(false);
    });
  });
});
