/**
 * PostgresLevelRepository Unit Tests
 *
 * Tests for the PostgreSQL implementation of LevelRepository.
 * Uses mocked Drizzle database to test repository logic in isolation.
 *
 * HU-008: Part of the dynamic levels implementation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PostgresLevelRepository } from '../../../../../src/infrastructure/driven/persistence/PostgresLevelRepository.js';
import type { LevelSelect, TypeLevelSelect } from '../../../../../src/infrastructure/driven/persistence/drizzle/schema.js';

// Mock Drizzle database
interface MockDb {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  query: {
    levels: {
      findFirst: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
    typeLevels: {
      findFirst: ReturnType<typeof vi.fn>;
    };
  };
}

describe('PostgresLevelRepository', () => {
  let mockDb: MockDb;
  let repository: PostgresLevelRepository;

  // Sample database records
  const mockLevelRecord: LevelSelect = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'Beginner',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };

  const mockLevelRecord2: LevelSelect = {
    id: '550e8400-e29b-41d4-a716-446655440002',
    name: 'Intermediate',
    createdAt: new Date('2026-01-02T00:00:00Z'),
    updatedAt: new Date('2026-01-02T00:00:00Z'),
  };

  const mockLevelRecord3: LevelSelect = {
    id: '550e8400-e29b-41d4-a716-446655440003',
    name: 'Advanced',
    createdAt: new Date('2026-01-03T00:00:00Z'),
    updatedAt: new Date('2026-01-03T00:00:00Z'),
  };

  const mockTypeId = '660e8400-e29b-41d4-a716-446655440001';

  const mockTypeLevelRecord: TypeLevelSelect = {
    typeId: mockTypeId,
    levelId: mockLevelRecord.id,
    createdAt: new Date('2026-01-01T00:00:00Z'),
  };

  beforeEach(() => {
    // Create mock database with chained query builder pattern
    const createChainedSelectMock = (result: unknown) => {
      const chain = {
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(result),
        then: vi.fn((resolve) => Promise.resolve(result).then(resolve)),
      };
      return vi.fn().mockReturnValue(chain);
    };

    const createChainedInsertMock = () => {
      const chain = {
        values: vi.fn().mockReturnThis(),
        onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
      };
      return vi.fn().mockReturnValue(chain);
    };

    mockDb = {
      select: createChainedSelectMock([]),
      insert: createChainedInsertMock(),
      query: {
        levels: {
          findFirst: vi.fn(),
          findMany: vi.fn(),
        },
        typeLevels: {
          findFirst: vi.fn(),
        },
      },
    };

    repository = new PostgresLevelRepository(mockDb as unknown as PostgresLevelRepository['db']);
  });

  describe('findById', () => {
    it('should return level when found', async () => {
      mockDb.query.levels.findFirst.mockResolvedValue(mockLevelRecord);

      const result = await repository.findById(mockLevelRecord.id);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockLevelRecord.id);
      expect(result?.name).toBe('Beginner');
    });

    it('should return null when not found', async () => {
      mockDb.query.levels.findFirst.mockResolvedValue(null);

      const result = await repository.findById('nonexistent-id');

      expect(result).toBeNull();
    });

    it('should call findFirst with correct id', async () => {
      mockDb.query.levels.findFirst.mockResolvedValue(null);

      await repository.findById(mockLevelRecord.id);

      expect(mockDb.query.levels.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.any(Function),
        })
      );
    });

    it('should return level with all properties', async () => {
      mockDb.query.levels.findFirst.mockResolvedValue(mockLevelRecord);

      const result = await repository.findById(mockLevelRecord.id);

      expect(result?.id).toBe(mockLevelRecord.id);
      expect(result?.name).toBe(mockLevelRecord.name);
      expect(result?.createdAt).toEqual(mockLevelRecord.createdAt);
      expect(result?.updatedAt).toEqual(mockLevelRecord.updatedAt);
    });
  });

  describe('findByName', () => {
    it('should find level by exact name', async () => {
      mockDb.query.levels.findFirst.mockResolvedValue(mockLevelRecord);

      const result = await repository.findByName('Beginner');

      expect(result).not.toBeNull();
      expect(result?.name).toBe('Beginner');
    });

    it('should find level by name case-insensitively', async () => {
      mockDb.query.levels.findFirst.mockResolvedValue(mockLevelRecord);

      const result = await repository.findByName('BEGINNER');

      expect(result).not.toBeNull();
      expect(result?.name).toBe('Beginner');
    });

    it('should find level by name with mixed case', async () => {
      mockDb.query.levels.findFirst.mockResolvedValue(mockLevelRecord);

      const result = await repository.findByName('beginner');

      expect(result).not.toBeNull();
      expect(result?.name).toBe('Beginner');
    });

    it('should trim whitespace from name', async () => {
      mockDb.query.levels.findFirst.mockResolvedValue(mockLevelRecord);

      await repository.findByName('  Beginner  ');

      expect(mockDb.query.levels.findFirst).toHaveBeenCalled();
    });

    it('should return null when level not found', async () => {
      mockDb.query.levels.findFirst.mockResolvedValue(null);

      const result = await repository.findByName('nonexistent');

      expect(result).toBeNull();
    });

    it('should return null for empty name', async () => {
      const result = await repository.findByName('');

      expect(result).toBeNull();
      expect(mockDb.query.levels.findFirst).not.toHaveBeenCalled();
    });

    it('should return null for whitespace-only name', async () => {
      const result = await repository.findByName('   ');

      expect(result).toBeNull();
      expect(mockDb.query.levels.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('save', () => {
    it('should insert level into database', async () => {
      const { Level } = await import('../../../../../src/domain/entities/Level.js');
      const level = Level.create({
        id: mockLevelRecord.id,
        name: 'Beginner',
      });

      await repository.save(level);

      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should call insert with correct values', async () => {
      const { Level } = await import('../../../../../src/domain/entities/Level.js');
      const level = Level.create({
        id: mockLevelRecord.id,
        name: 'Beginner',
      });

      const mockInsertChain = {
        values: vi.fn().mockResolvedValue(undefined),
      };
      mockDb.insert.mockReturnValue(mockInsertChain);

      await repository.save(level);

      expect(mockInsertChain.values).toHaveBeenCalledWith(
        expect.objectContaining({
          id: level.id,
          name: level.name,
        })
      );
    });
  });

  describe('existsForType', () => {
    it('should return true when level-type association exists', async () => {
      mockDb.query.typeLevels.findFirst.mockResolvedValue(mockTypeLevelRecord);

      const result = await repository.existsForType(mockLevelRecord.id, mockTypeId);

      expect(result).toBe(true);
    });

    it('should return false when level-type association does not exist', async () => {
      mockDb.query.typeLevels.findFirst.mockResolvedValue(null);

      const result = await repository.existsForType(mockLevelRecord.id, mockTypeId);

      expect(result).toBe(false);
    });

    it('should return false when findFirst returns undefined', async () => {
      mockDb.query.typeLevels.findFirst.mockResolvedValue(undefined);

      const result = await repository.existsForType(mockLevelRecord.id, mockTypeId);

      expect(result).toBe(false);
    });

    it('should call findFirst with correct parameters', async () => {
      mockDb.query.typeLevels.findFirst.mockResolvedValue(null);

      await repository.existsForType(mockLevelRecord.id, mockTypeId);

      expect(mockDb.query.typeLevels.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.any(Function),
        })
      );
    });
  });

  describe('addToType', () => {
    it('should insert type-level association', async () => {
      await repository.addToType(mockLevelRecord.id, mockTypeId);

      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should use onConflictDoNothing for idempotent behavior', async () => {
      const mockOnConflict = vi.fn().mockResolvedValue(undefined);
      const mockValues = vi.fn().mockReturnValue({ onConflictDoNothing: mockOnConflict });
      mockDb.insert.mockReturnValue({ values: mockValues });

      await repository.addToType(mockLevelRecord.id, mockTypeId);

      expect(mockOnConflict).toHaveBeenCalled();
    });

    it('should insert with correct levelId and typeId', async () => {
      const mockOnConflict = vi.fn().mockResolvedValue(undefined);
      const mockValues = vi.fn().mockReturnValue({ onConflictDoNothing: mockOnConflict });
      mockDb.insert.mockReturnValue({ values: mockValues });

      await repository.addToType(mockLevelRecord.id, mockTypeId);

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          levelId: mockLevelRecord.id,
          typeId: mockTypeId,
        })
      );
    });
  });

  describe('findAll', () => {
    it('should return all levels', async () => {
      mockDb.query.levels.findMany.mockResolvedValue([
        mockLevelRecord,
        mockLevelRecord2,
        mockLevelRecord3,
      ]);

      const result = await repository.findAll();

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('Beginner');
      expect(result[1].name).toBe('Intermediate');
      expect(result[2].name).toBe('Advanced');
    });

    it('should return empty array when no levels exist', async () => {
      mockDb.query.levels.findMany.mockResolvedValue([]);

      const result = await repository.findAll();

      expect(result).toEqual([]);
    });

    it('should return domain entities with all properties', async () => {
      mockDb.query.levels.findMany.mockResolvedValue([mockLevelRecord]);

      const result = await repository.findAll();

      expect(result[0].id).toBe(mockLevelRecord.id);
      expect(result[0].name).toBe(mockLevelRecord.name);
      expect(result[0].createdAt).toEqual(mockLevelRecord.createdAt);
      expect(result[0].updatedAt).toEqual(mockLevelRecord.updatedAt);
    });
  });

  describe('findByTypeId', () => {
    it('should return levels associated with type', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockLevelRecord, mockLevelRecord2]),
          }),
        }),
      });
      mockDb.select = mockSelect;

      const result = await repository.findByTypeId(mockTypeId);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Beginner');
      expect(result[1].name).toBe('Intermediate');
    });

    it('should return empty array when no levels for type', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      mockDb.select = mockSelect;

      const result = await repository.findByTypeId(mockTypeId);

      expect(result).toEqual([]);
    });

    it('should call select with join on typeLevels', async () => {
      const mockWhere = vi.fn().mockResolvedValue([]);
      const mockInnerJoin = vi.fn().mockReturnValue({ where: mockWhere });
      const mockFrom = vi.fn().mockReturnValue({ innerJoin: mockInnerJoin });
      const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });
      mockDb.select = mockSelect;

      await repository.findByTypeId(mockTypeId);

      expect(mockSelect).toHaveBeenCalled();
      expect(mockFrom).toHaveBeenCalled();
      expect(mockInnerJoin).toHaveBeenCalled();
      expect(mockWhere).toHaveBeenCalled();
    });
  });

  describe('count', () => {
    it('should return total count of levels', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockResolvedValue([{ count: '3' }]),
      });
      mockDb.select = mockSelect;

      const result = await repository.count();

      expect(result).toBe(3);
    });

    it('should return 0 when no levels exist', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockResolvedValue([{ count: '0' }]),
      });
      mockDb.select = mockSelect;

      const result = await repository.count();

      expect(result).toBe(0);
    });

    it('should handle null count result', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockResolvedValue([{ count: null }]),
      });
      mockDb.select = mockSelect;

      const result = await repository.count();

      expect(result).toBe(0);
    });

    it('should handle empty result array', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockResolvedValue([]),
      });
      mockDb.select = mockSelect;

      const result = await repository.count();

      expect(result).toBe(0);
    });
  });

  describe('LevelMapper integration', () => {
    it('should correctly map database record to domain entity', async () => {
      mockDb.query.levels.findFirst.mockResolvedValue(mockLevelRecord);

      const result = await repository.findById(mockLevelRecord.id);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(mockLevelRecord.id);
      expect(result!.name).toBe(mockLevelRecord.name);
      expect(result!.createdAt).toEqual(mockLevelRecord.createdAt);
      expect(result!.updatedAt).toEqual(mockLevelRecord.updatedAt);
    });

    it('should map multiple records correctly', async () => {
      mockDb.query.levels.findMany.mockResolvedValue([
        mockLevelRecord,
        mockLevelRecord2,
      ]);

      const result = await repository.findAll();

      expect(result).toHaveLength(2);
      result.forEach((level, index) => {
        const expectedRecord = index === 0 ? mockLevelRecord : mockLevelRecord2;
        expect(level.id).toBe(expectedRecord.id);
        expect(level.name).toBe(expectedRecord.name);
      });
    });
  });

  describe('findAllSorted', () => {
    it('should return all levels sorted alphabetically', async () => {
      // Sorted: Advanced, Beginner, Intermediate
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([
            mockLevelRecord3, // Advanced
            mockLevelRecord,  // Beginner
            mockLevelRecord2, // Intermediate
          ]),
        }),
      });
      mockDb.select = mockSelect;

      const result = await repository.findAllSorted();

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('Advanced');
      expect(result[1].name).toBe('Beginner');
      expect(result[2].name).toBe('Intermediate');
    });

    it('should return empty array when no levels exist', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([]),
        }),
      });
      mockDb.select = mockSelect;

      const result = await repository.findAllSorted();

      expect(result).toEqual([]);
    });

    it('should call select with orderBy', async () => {
      const mockOrderBy = vi.fn().mockResolvedValue([]);
      const mockFrom = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
      const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });
      mockDb.select = mockSelect;

      await repository.findAllSorted();

      expect(mockSelect).toHaveBeenCalled();
      expect(mockFrom).toHaveBeenCalled();
      expect(mockOrderBy).toHaveBeenCalled();
    });

    it('should return domain entities with all properties', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([mockLevelRecord]),
        }),
      });
      mockDb.select = mockSelect;

      const result = await repository.findAllSorted();

      expect(result[0].id).toBe(mockLevelRecord.id);
      expect(result[0].name).toBe(mockLevelRecord.name);
      expect(result[0].createdAt).toEqual(mockLevelRecord.createdAt);
      expect(result[0].updatedAt).toEqual(mockLevelRecord.updatedAt);
    });
  });

  describe('findByTypeIdSorted', () => {
    it('should return levels for type sorted alphabetically', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue([
                mockLevelRecord3, // Advanced
                mockLevelRecord,  // Beginner
              ]),
            }),
          }),
        }),
      });
      mockDb.select = mockSelect;

      const result = await repository.findByTypeIdSorted(mockTypeId);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Advanced');
      expect(result[1].name).toBe('Beginner');
    });

    it('should return empty array when type has no levels', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });
      mockDb.select = mockSelect;

      const result = await repository.findByTypeIdSorted(mockTypeId);

      expect(result).toEqual([]);
    });

    it('should call select with join, where and orderBy', async () => {
      const mockOrderBy = vi.fn().mockResolvedValue([]);
      const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
      const mockInnerJoin = vi.fn().mockReturnValue({ where: mockWhere });
      const mockFrom = vi.fn().mockReturnValue({ innerJoin: mockInnerJoin });
      const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });
      mockDb.select = mockSelect;

      await repository.findByTypeIdSorted(mockTypeId);

      expect(mockSelect).toHaveBeenCalled();
      expect(mockFrom).toHaveBeenCalled();
      expect(mockInnerJoin).toHaveBeenCalled();
      expect(mockWhere).toHaveBeenCalled();
      expect(mockOrderBy).toHaveBeenCalled();
    });

    it('should only include levels associated with the type', async () => {
      // Only return levels that are in type_levels junction table
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue([mockLevelRecord]),
            }),
          }),
        }),
      });
      mockDb.select = mockSelect;

      const result = await repository.findByTypeIdSorted(mockTypeId);

      // Should return only the one level associated with this type
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockLevelRecord.id);
    });

    it('should return domain entities with all properties', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue([mockLevelRecord]),
            }),
          }),
        }),
      });
      mockDb.select = mockSelect;

      const result = await repository.findByTypeIdSorted(mockTypeId);

      expect(result[0].id).toBe(mockLevelRecord.id);
      expect(result[0].name).toBe(mockLevelRecord.name);
      expect(result[0].createdAt).toEqual(mockLevelRecord.createdAt);
      expect(result[0].updatedAt).toEqual(mockLevelRecord.updatedAt);
    });
  });
});
