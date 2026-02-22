/**
 * Unit Tests: ListBookTypesUseCase
 *
 * Tests for the use case that lists all book types sorted alphabetically.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ListBookTypesUseCase } from '../../../../src/application/use-cases/ListBookTypesUseCase.js';
import { BookType } from '../../../../src/domain/entities/BookType.js';
import type { TypeRepository } from '../../../../src/application/ports/TypeRepository.js';

describe('ListBookTypesUseCase', () => {
  let mockTypeRepository: TypeRepository;
  let useCase: ListBookTypesUseCase;

  // Sample book types
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

  const biographyType = BookType.fromPersistence({
    id: '550e8400-e29b-41d4-a716-446655440003',
    name: 'biography',
    createdAt: new Date('2026-01-03T00:00:00Z'),
    updatedAt: new Date('2026-01-03T00:00:00Z'),
  });

  beforeEach(() => {
    mockTypeRepository = {
      findById: vi.fn(),
      findByName: vi.fn(),
      findAll: vi.fn(),
      findAllSorted: vi.fn(),
      count: vi.fn(),
    };

    useCase = new ListBookTypesUseCase(mockTypeRepository);
  });

  describe('execute', () => {
    it('should return all book types sorted alphabetically', async () => {
      vi.mocked(mockTypeRepository.findAllSorted).mockResolvedValue([
        biographyType,
        novelType,
        technicalType,
      ]);

      const result = await useCase.execute();

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('biography');
      expect(result[1].name).toBe('novel');
      expect(result[2].name).toBe('technical');
    });

    it('should return DTOs with only id and name', async () => {
      vi.mocked(mockTypeRepository.findAllSorted).mockResolvedValue([technicalType]);

      const result = await useCase.execute();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: technicalType.id,
        name: technicalType.name,
      });
      // Should NOT have createdAt/updatedAt
      expect(result[0]).not.toHaveProperty('createdAt');
      expect(result[0]).not.toHaveProperty('updatedAt');
    });

    it('should return empty array when no types exist', async () => {
      vi.mocked(mockTypeRepository.findAllSorted).mockResolvedValue([]);

      const result = await useCase.execute();

      expect(result).toEqual([]);
    });

    it('should call findAllSorted on the repository', async () => {
      vi.mocked(mockTypeRepository.findAllSorted).mockResolvedValue([]);

      await useCase.execute();

      expect(mockTypeRepository.findAllSorted).toHaveBeenCalledOnce();
    });

    it('should propagate repository errors', async () => {
      const error = new Error('Database connection failed');
      vi.mocked(mockTypeRepository.findAllSorted).mockRejectedValue(error);

      await expect(useCase.execute()).rejects.toThrow('Database connection failed');
    });

    it('should map multiple types correctly', async () => {
      vi.mocked(mockTypeRepository.findAllSorted).mockResolvedValue([
        biographyType,
        novelType,
        technicalType,
      ]);

      const result = await useCase.execute();

      expect(result).toEqual([
        { id: biographyType.id, name: 'biography' },
        { id: novelType.id, name: 'novel' },
        { id: technicalType.id, name: 'technical' },
      ]);
    });
  });

  describe('constructor', () => {
    it('should accept TypeRepository dependency', () => {
      const newUseCase = new ListBookTypesUseCase(mockTypeRepository);

      expect(newUseCase).toBeInstanceOf(ListBookTypesUseCase);
    });
  });
});
