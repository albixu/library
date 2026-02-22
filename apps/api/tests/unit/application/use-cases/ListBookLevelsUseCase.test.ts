/**
 * Unit Tests: ListBookLevelsUseCase
 *
 * Tests for the use case that lists book levels with optional type filter.
 * HU-010: Levels are returned sorted alphabetically by name (A-Z).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ListBookLevelsUseCase } from '../../../../src/application/use-cases/ListBookLevelsUseCase.js';
import { Level } from '../../../../src/domain/entities/Level.js';
import { BookType } from '../../../../src/domain/entities/BookType.js';
import type { LevelRepository } from '../../../../src/application/ports/LevelRepository.js';
import type { TypeRepository } from '../../../../src/application/ports/TypeRepository.js';

describe('ListBookLevelsUseCase', () => {
  let mockLevelRepository: LevelRepository;
  let mockTypeRepository: TypeRepository;
  let useCase: ListBookLevelsUseCase;

  // Sample types
  const technicalType = BookType.fromPersistence({
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'technical',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  });

  const novelType = BookType.fromPersistence({
    id: '550e8400-e29b-41d4-a716-446655440002',
    name: 'novel',
    createdAt: new Date('2026-01-02T00:00:00Z'),
    updatedAt: new Date('2026-01-02T00:00:00Z'),
  });

  // Sample levels
  const advancedLevel = Level.fromPersistence({
    id: '660e8400-e29b-41d4-a716-446655440001',
    name: 'advanced',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  });

  const beginnerLevel = Level.fromPersistence({
    id: '660e8400-e29b-41d4-a716-446655440002',
    name: 'beginner',
    createdAt: new Date('2026-01-02T00:00:00Z'),
    updatedAt: new Date('2026-01-02T00:00:00Z'),
  });

  const intermediateLevel = Level.fromPersistence({
    id: '660e8400-e29b-41d4-a716-446655440003',
    name: 'intermediate',
    createdAt: new Date('2026-01-03T00:00:00Z'),
    updatedAt: new Date('2026-01-03T00:00:00Z'),
  });

  beforeEach(() => {
    mockLevelRepository = {
      findById: vi.fn(),
      findByName: vi.fn(),
      save: vi.fn(),
      existsForType: vi.fn(),
      addToType: vi.fn(),
      findAll: vi.fn(),
      findByTypeId: vi.fn(),
      count: vi.fn(),
      findAllSorted: vi.fn(),
      findByTypeIdSorted: vi.fn(),
    };

    mockTypeRepository = {
      findById: vi.fn(),
      findByName: vi.fn(),
      findAll: vi.fn(),
      findAllSorted: vi.fn(),
      count: vi.fn(),
    };

    useCase = new ListBookLevelsUseCase(mockLevelRepository, mockTypeRepository);
  });

  describe('execute without type filter', () => {
    it('should return all levels sorted alphabetically', async () => {
      vi.mocked(mockLevelRepository.findAllSorted).mockResolvedValue([
        advancedLevel,
        beginnerLevel,
        intermediateLevel,
      ]);

      const result = await useCase.execute();

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('advanced');
      expect(result[1].name).toBe('beginner');
      expect(result[2].name).toBe('intermediate');
    });

    it('should return DTOs with only id and name', async () => {
      vi.mocked(mockLevelRepository.findAllSorted).mockResolvedValue([advancedLevel]);

      const result = await useCase.execute();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: advancedLevel.id,
        name: advancedLevel.name,
      });
      // Should NOT have createdAt/updatedAt
      expect(result[0]).not.toHaveProperty('createdAt');
      expect(result[0]).not.toHaveProperty('updatedAt');
    });

    it('should return empty array when no levels exist', async () => {
      vi.mocked(mockLevelRepository.findAllSorted).mockResolvedValue([]);

      const result = await useCase.execute();

      expect(result).toEqual([]);
    });

    it('should call findAllSorted on the repository', async () => {
      vi.mocked(mockLevelRepository.findAllSorted).mockResolvedValue([]);

      await useCase.execute();

      expect(mockLevelRepository.findAllSorted).toHaveBeenCalledOnce();
      expect(mockTypeRepository.findByName).not.toHaveBeenCalled();
    });

    it('should return multiple levels from different type associations', async () => {
      vi.mocked(mockLevelRepository.findAllSorted).mockResolvedValue([
        advancedLevel,
        beginnerLevel,
      ]);

      const result = await useCase.execute();

      expect(result).toHaveLength(2);
    });
  });

  describe('execute with type filter', () => {
    it('should return levels filtered by type name', async () => {
      vi.mocked(mockTypeRepository.findByName).mockResolvedValue(technicalType);
      vi.mocked(mockLevelRepository.findByTypeIdSorted).mockResolvedValue([
        advancedLevel,
        intermediateLevel,
      ]);

      const result = await useCase.execute('technical');

      expect(result).toHaveLength(2);
      expect(mockLevelRepository.findByTypeIdSorted).toHaveBeenCalledWith(technicalType.id);
    });

    it('should return empty array when type does not exist', async () => {
      vi.mocked(mockTypeRepository.findByName).mockResolvedValue(null);

      const result = await useCase.execute('nonexistent');

      expect(result).toEqual([]);
      expect(mockLevelRepository.findByTypeIdSorted).not.toHaveBeenCalled();
    });

    it('should pass type name to findByName for case-insensitive search', async () => {
      vi.mocked(mockTypeRepository.findByName).mockResolvedValue(technicalType);
      vi.mocked(mockLevelRepository.findByTypeIdSorted).mockResolvedValue([]);

      await useCase.execute('TECHNICAL');

      expect(mockTypeRepository.findByName).toHaveBeenCalledWith('TECHNICAL');
    });

    it('should call findByTypeIdSorted with correct typeId', async () => {
      vi.mocked(mockTypeRepository.findByName).mockResolvedValue(novelType);
      vi.mocked(mockLevelRepository.findByTypeIdSorted).mockResolvedValue([]);

      await useCase.execute('novel');

      expect(mockLevelRepository.findByTypeIdSorted).toHaveBeenCalledWith(novelType.id);
    });

    it('should return empty array when type exists but has no levels', async () => {
      vi.mocked(mockTypeRepository.findByName).mockResolvedValue(technicalType);
      vi.mocked(mockLevelRepository.findByTypeIdSorted).mockResolvedValue([]);

      const result = await useCase.execute('technical');

      expect(result).toEqual([]);
    });

    it('should map filtered levels to DTOs', async () => {
      vi.mocked(mockTypeRepository.findByName).mockResolvedValue(novelType);
      vi.mocked(mockLevelRepository.findByTypeIdSorted).mockResolvedValue([beginnerLevel]);

      const result = await useCase.execute('novel');

      expect(result).toEqual([{
        id: beginnerLevel.id,
        name: beginnerLevel.name,
      }]);
    });

    it('should not call findAllSorted when type filter is provided', async () => {
      vi.mocked(mockTypeRepository.findByName).mockResolvedValue(technicalType);
      vi.mocked(mockLevelRepository.findByTypeIdSorted).mockResolvedValue([advancedLevel]);

      await useCase.execute('technical');

      expect(mockLevelRepository.findAllSorted).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should propagate repository errors from findAllSorted', async () => {
      const error = new Error('Database connection failed');
      vi.mocked(mockLevelRepository.findAllSorted).mockRejectedValue(error);

      await expect(useCase.execute()).rejects.toThrow('Database connection failed');
    });

    it('should propagate repository errors from findByName', async () => {
      const error = new Error('Database connection failed');
      vi.mocked(mockTypeRepository.findByName).mockRejectedValue(error);

      await expect(useCase.execute('technical')).rejects.toThrow('Database connection failed');
    });

    it('should propagate repository errors from findByTypeIdSorted', async () => {
      const error = new Error('Database connection failed');
      vi.mocked(mockTypeRepository.findByName).mockResolvedValue(technicalType);
      vi.mocked(mockLevelRepository.findByTypeIdSorted).mockRejectedValue(error);

      await expect(useCase.execute('technical')).rejects.toThrow('Database connection failed');
    });
  });

  describe('constructor', () => {
    it('should accept LevelRepository and TypeRepository dependencies', () => {
      const newUseCase = new ListBookLevelsUseCase(mockLevelRepository, mockTypeRepository);

      expect(newUseCase).toBeInstanceOf(ListBookLevelsUseCase);
    });
  });
});
