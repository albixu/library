/**
 * LevelMapper Unit Tests
 *
 * Tests for the Level entity mapper that converts between
 * domain entities and database records.
 *
 * HU-008: Part of the dynamic levels implementation.
 */

import { describe, it, expect } from 'vitest';
import { LevelMapper } from '../../../../../src/infrastructure/driven/persistence/mappers/LevelMapper.js';
import { Level } from '../../../../../src/domain/entities/Level.js';
import type { LevelSelect } from '../../../../../src/infrastructure/driven/persistence/drizzle/schema.js';

describe('LevelMapper', () => {
  // Test fixtures
  const validId = '550e8400-e29b-41d4-a716-446655440001';
  const validId2 = '550e8400-e29b-41d4-a716-446655440002';
  const createdAt = new Date('2026-01-01T00:00:00Z');
  const updatedAt = new Date('2026-01-15T00:00:00Z');

  const mockDbRecord: LevelSelect = {
    id: validId,
    name: 'Beginner',
    createdAt,
    updatedAt,
  };

  const mockDbRecord2: LevelSelect = {
    id: validId2,
    name: 'Advanced',
    createdAt,
    updatedAt,
  };

  describe('toDomain', () => {
    it('should convert database record to Level entity', () => {
      const result = LevelMapper.toDomain(mockDbRecord);

      expect(result).toBeInstanceOf(Level);
      expect(result.id).toBe(validId);
      expect(result.name).toBe('Beginner');
      expect(result.createdAt).toEqual(createdAt);
      expect(result.updatedAt).toEqual(updatedAt);
    });

    it('should handle different level names', () => {
      const intermediateRecord: LevelSelect = {
        id: validId2,
        name: 'Intermediate',
        createdAt,
        updatedAt,
      };

      const result = LevelMapper.toDomain(intermediateRecord);

      expect(result.name).toBe('Intermediate');
    });

    it('should preserve timestamps exactly', () => {
      const specificCreated = new Date('2025-06-15T10:30:00.000Z');
      const specificUpdated = new Date('2025-12-20T15:45:30.000Z');

      const record: LevelSelect = {
        id: validId,
        name: 'Expert',
        createdAt: specificCreated,
        updatedAt: specificUpdated,
      };

      const result = LevelMapper.toDomain(record);

      expect(result.createdAt.toISOString()).toBe(specificCreated.toISOString());
      expect(result.updatedAt.toISOString()).toBe(specificUpdated.toISOString());
    });

    it('should create immutable Level entity', () => {
      const result = LevelMapper.toDomain(mockDbRecord);

      expect(Object.isFrozen(result)).toBe(true);
    });
  });

  describe('toPersistence', () => {
    it('should convert Level entity to database insert record', () => {
      const level = Level.fromPersistence({
        id: validId,
        name: 'Beginner',
        createdAt,
        updatedAt,
      });

      const result = LevelMapper.toPersistence(level);

      expect(result.id).toBe(validId);
      expect(result.name).toBe('Beginner');
      expect(result.createdAt).toEqual(createdAt);
      expect(result.updatedAt).toEqual(updatedAt);
    });

    it('should preserve all fields when converting to persistence', () => {
      const specificDate = new Date('2025-11-11T11:11:11.000Z');
      const level = Level.fromPersistence({
        id: validId2,
        name: 'Master',
        createdAt: specificDate,
        updatedAt: specificDate,
      });

      const result = LevelMapper.toPersistence(level);

      expect(result).toEqual({
        id: validId2,
        name: 'Master',
        createdAt: specificDate,
        updatedAt: specificDate,
      });
    });

    it('should handle entities created via create method', () => {
      const level = Level.create({
        id: validId,
        name: 'Novice',
      });

      const result = LevelMapper.toPersistence(level);

      expect(result.id).toBe(validId);
      expect(result.name).toBe('Novice');
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('toDomainList', () => {
    it('should convert empty array to empty array', () => {
      const result = LevelMapper.toDomainList([]);

      expect(result).toEqual([]);
    });

    it('should convert single record to array with one entity', () => {
      const result = LevelMapper.toDomainList([mockDbRecord]);

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(Level);
      expect(result[0].id).toBe(validId);
    });

    it('should convert multiple records to array of entities', () => {
      const result = LevelMapper.toDomainList([mockDbRecord, mockDbRecord2]);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Beginner');
      expect(result[1].name).toBe('Advanced');
    });

    it('should preserve order of records', () => {
      const records = [mockDbRecord2, mockDbRecord];

      const result = LevelMapper.toDomainList(records);

      expect(result[0].id).toBe(validId2);
      expect(result[1].id).toBe(validId);
    });
  });

  describe('toPersistenceList', () => {
    it('should convert empty array to empty array', () => {
      const result = LevelMapper.toPersistenceList([]);

      expect(result).toEqual([]);
    });

    it('should convert single entity to array with one record', () => {
      const level = Level.fromPersistence({
        id: validId,
        name: 'Beginner',
        createdAt,
        updatedAt,
      });

      const result = LevelMapper.toPersistenceList([level]);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(validId);
    });

    it('should convert multiple entities to array of records', () => {
      const level1 = Level.fromPersistence({
        id: validId,
        name: 'Beginner',
        createdAt,
        updatedAt,
      });
      const level2 = Level.fromPersistence({
        id: validId2,
        name: 'Advanced',
        createdAt,
        updatedAt,
      });

      const result = LevelMapper.toPersistenceList([level1, level2]);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Beginner');
      expect(result[1].name).toBe('Advanced');
    });

    it('should preserve order of entities', () => {
      const level1 = Level.fromPersistence({
        id: validId,
        name: 'First',
        createdAt,
        updatedAt,
      });
      const level2 = Level.fromPersistence({
        id: validId2,
        name: 'Second',
        createdAt,
        updatedAt,
      });

      const result = LevelMapper.toPersistenceList([level2, level1]);

      expect(result[0].name).toBe('Second');
      expect(result[1].name).toBe('First');
    });
  });

  describe('round-trip conversion', () => {
    it('should preserve data through toDomain -> toPersistence cycle', () => {
      const originalRecord: LevelSelect = {
        id: validId,
        name: 'Professional',
        createdAt: new Date('2026-03-15T08:30:00Z'),
        updatedAt: new Date('2026-03-20T14:00:00Z'),
      };

      const entity = LevelMapper.toDomain(originalRecord);
      const result = LevelMapper.toPersistence(entity);

      expect(result.id).toBe(originalRecord.id);
      expect(result.name).toBe(originalRecord.name);
      expect(result.createdAt).toEqual(originalRecord.createdAt);
      expect(result.updatedAt).toEqual(originalRecord.updatedAt);
    });

    it('should preserve data through toPersistence -> toDomain cycle', () => {
      const originalEntity = Level.fromPersistence({
        id: validId2,
        name: 'Expert',
        createdAt: new Date('2026-05-01T00:00:00Z'),
        updatedAt: new Date('2026-05-15T12:00:00Z'),
      });

      const record = LevelMapper.toPersistence(originalEntity);
      const result = LevelMapper.toDomain(record);

      expect(result.id).toBe(originalEntity.id);
      expect(result.name).toBe(originalEntity.name);
      expect(result.createdAt.toISOString()).toBe(originalEntity.createdAt.toISOString());
      expect(result.updatedAt.toISOString()).toBe(originalEntity.updatedAt.toISOString());
    });
  });
});
