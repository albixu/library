/**
 * Unit Tests: ListCategoriesUseCase
 *
 * Tests for the use case that lists categories with optional type filter.
 * HU-009: Categories are returned sorted alphabetically by name (A-Z).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ListCategoriesUseCase } from '../../../../src/application/use-cases/ListCategoriesUseCase.js';
import { Category } from '../../../../src/domain/entities/Category.js';
import { BookType } from '../../../../src/domain/entities/BookType.js';
import type { CategoryRepository } from '../../../../src/application/ports/CategoryRepository.js';
import type { TypeRepository } from '../../../../src/application/ports/TypeRepository.js';

describe('ListCategoriesUseCase', () => {
  let mockCategoryRepository: CategoryRepository;
  let mockTypeRepository: TypeRepository;
  let useCase: ListCategoriesUseCase;

  // Sample type
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

  // Sample categories
  const architectureCategory = Category.fromPersistence({
    id: '660e8400-e29b-41d4-a716-446655440001',
    name: 'architecture',
    typeId: technicalType.id,
    description: 'Books about software architecture',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  });

  const programmingCategory = Category.fromPersistence({
    id: '660e8400-e29b-41d4-a716-446655440002',
    name: 'programming',
    typeId: technicalType.id,
    description: null,
    createdAt: new Date('2026-01-02T00:00:00Z'),
    updatedAt: new Date('2026-01-02T00:00:00Z'),
  });

  const fantasyCategory = Category.fromPersistence({
    id: '660e8400-e29b-41d4-a716-446655440003',
    name: 'fantasy',
    typeId: novelType.id,
    description: 'Fantasy novels',
    createdAt: new Date('2026-01-03T00:00:00Z'),
    updatedAt: new Date('2026-01-03T00:00:00Z'),
  });

  beforeEach(() => {
    mockCategoryRepository = {
      findById: vi.fn(),
      findByName: vi.fn(),
      findByNameAndTypeId: vi.fn(),
      findByNames: vi.fn(),
      findByTypeId: vi.fn(),
      findOrCreate: vi.fn(),
      findOrCreateMany: vi.fn(),
      save: vi.fn(),
      saveMany: vi.fn(),
      findAll: vi.fn(),
      findAllSorted: vi.fn(),
      findByTypeIdSorted: vi.fn(),
      count: vi.fn(),
    };

    mockTypeRepository = {
      findById: vi.fn(),
      findByName: vi.fn(),
      findAll: vi.fn(),
      findAllSorted: vi.fn(),
      count: vi.fn(),
    };

    useCase = new ListCategoriesUseCase(mockCategoryRepository, mockTypeRepository);
  });

  describe('execute without type filter', () => {
    it('should return all categories sorted alphabetically', async () => {
      vi.mocked(mockCategoryRepository.findAllSorted).mockResolvedValue([
        architectureCategory,
        programmingCategory,
      ]);

      const result = await useCase.execute();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('architecture');
      expect(result[1].name).toBe('programming');
    });

    it('should return DTOs with id, name, typeId, and description', async () => {
      vi.mocked(mockCategoryRepository.findAllSorted).mockResolvedValue([architectureCategory]);

      const result = await useCase.execute();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: architectureCategory.id,
        name: architectureCategory.name,
        typeId: architectureCategory.typeId,
        description: architectureCategory.description,
      });
      // Should NOT have createdAt/updatedAt
      expect(result[0]).not.toHaveProperty('createdAt');
      expect(result[0]).not.toHaveProperty('updatedAt');
    });

    it('should return empty array when no categories exist', async () => {
      vi.mocked(mockCategoryRepository.findAllSorted).mockResolvedValue([]);

      const result = await useCase.execute();

      expect(result).toEqual([]);
    });

    it('should call findAllSorted on the repository', async () => {
      vi.mocked(mockCategoryRepository.findAllSorted).mockResolvedValue([]);

      await useCase.execute();

      expect(mockCategoryRepository.findAllSorted).toHaveBeenCalledOnce();
      expect(mockTypeRepository.findByName).not.toHaveBeenCalled();
    });

    it('should include categories from all types', async () => {
      vi.mocked(mockCategoryRepository.findAllSorted).mockResolvedValue([
        architectureCategory,
        fantasyCategory,
        programmingCategory,
      ]);

      const result = await useCase.execute();

      expect(result).toHaveLength(3);
      const typeIds = result.map(c => c.typeId);
      expect(typeIds).toContain(technicalType.id);
      expect(typeIds).toContain(novelType.id);
    });

    it('should handle categories with null description', async () => {
      vi.mocked(mockCategoryRepository.findAllSorted).mockResolvedValue([programmingCategory]);

      const result = await useCase.execute();

      expect(result[0].description).toBeNull();
    });
  });

  describe('execute with type filter', () => {
    it('should return categories filtered by type name', async () => {
      vi.mocked(mockTypeRepository.findByName).mockResolvedValue(technicalType);
      vi.mocked(mockCategoryRepository.findByTypeIdSorted).mockResolvedValue([
        architectureCategory,
        programmingCategory,
      ]);

      const result = await useCase.execute('technical');

      expect(result).toHaveLength(2);
      expect(result.every(c => c.typeId === technicalType.id)).toBe(true);
    });

    it('should return empty array when type does not exist', async () => {
      vi.mocked(mockTypeRepository.findByName).mockResolvedValue(null);

      const result = await useCase.execute('nonexistent');

      expect(result).toEqual([]);
      expect(mockCategoryRepository.findByTypeIdSorted).not.toHaveBeenCalled();
    });

    it('should search type name case-insensitively', async () => {
      vi.mocked(mockTypeRepository.findByName).mockResolvedValue(technicalType);
      vi.mocked(mockCategoryRepository.findByTypeIdSorted).mockResolvedValue([]);

      await useCase.execute('TECHNICAL');

      expect(mockTypeRepository.findByName).toHaveBeenCalledWith('TECHNICAL');
    });

    it('should call findByTypeIdSorted with correct typeId', async () => {
      vi.mocked(mockTypeRepository.findByName).mockResolvedValue(technicalType);
      vi.mocked(mockCategoryRepository.findByTypeIdSorted).mockResolvedValue([]);

      await useCase.execute('technical');

      expect(mockCategoryRepository.findByTypeIdSorted).toHaveBeenCalledWith(technicalType.id);
    });

    it('should return empty array when type exists but has no categories', async () => {
      vi.mocked(mockTypeRepository.findByName).mockResolvedValue(technicalType);
      vi.mocked(mockCategoryRepository.findByTypeIdSorted).mockResolvedValue([]);

      const result = await useCase.execute('technical');

      expect(result).toEqual([]);
    });

    it('should map filtered categories to DTOs', async () => {
      vi.mocked(mockTypeRepository.findByName).mockResolvedValue(novelType);
      vi.mocked(mockCategoryRepository.findByTypeIdSorted).mockResolvedValue([fantasyCategory]);

      const result = await useCase.execute('novel');

      expect(result).toEqual([{
        id: fantasyCategory.id,
        name: fantasyCategory.name,
        typeId: fantasyCategory.typeId,
        description: fantasyCategory.description,
      }]);
    });
  });

  describe('error handling', () => {
    it('should propagate repository errors from findAllSorted', async () => {
      const error = new Error('Database connection failed');
      vi.mocked(mockCategoryRepository.findAllSorted).mockRejectedValue(error);

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
      vi.mocked(mockCategoryRepository.findByTypeIdSorted).mockRejectedValue(error);

      await expect(useCase.execute('technical')).rejects.toThrow('Database connection failed');
    });
  });

  describe('constructor', () => {
    it('should accept CategoryRepository and TypeRepository dependencies', () => {
      const newUseCase = new ListCategoriesUseCase(mockCategoryRepository, mockTypeRepository);

      expect(newUseCase).toBeInstanceOf(ListCategoriesUseCase);
    });
  });
});
