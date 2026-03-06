import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PostgresTypeRepository } from '../../../../../src/infrastructure/driven/persistence/PostgresTypeRepository.js';
import type { TypeSelect, TypeLevelSelect } from '../../../../../src/infrastructure/driven/persistence/drizzle/schema.js';

// Mock Drizzle database
interface MockDb {
  select: ReturnType<typeof vi.fn>;
  query: {
    types: {
      findFirst: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
    typeLevels: {
      findMany: ReturnType<typeof vi.fn>;
    };
  };
}

describe('PostgresTypeRepository', () => {
  let mockDb: MockDb;
  let repository: PostgresTypeRepository;

  // Test UUIDs
  const TYPE_ID_1 = '550e8400-e29b-41d4-a716-446655440001';
  const TYPE_ID_2 = '550e8400-e29b-41d4-a716-446655440002';
  const TYPE_ID_3 = '550e8400-e29b-41d4-a716-446655440003';
  const LEVEL_ID_1 = '550e8400-e29b-41d4-a716-446655440101';
  const LEVEL_ID_2 = '550e8400-e29b-41d4-a716-446655440102';
  const LEVEL_ID_3 = '550e8400-e29b-41d4-a716-446655440103';

  // Sample database records
  const mockTypeRecord: TypeSelect = {
    id: TYPE_ID_1,
    name: 'technical',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };

  const mockTypeRecord2: TypeSelect = {
    id: TYPE_ID_2,
    name: 'novel',
    createdAt: new Date('2026-01-02T00:00:00Z'),
    updatedAt: new Date('2026-01-02T00:00:00Z'),
  };

  const mockTypeRecord3: TypeSelect = {
    id: TYPE_ID_3,
    name: 'biography',
    createdAt: new Date('2026-01-03T00:00:00Z'),
    updatedAt: new Date('2026-01-03T00:00:00Z'),
  };

  // HU-008: Type-Level junction records
  const mockTypeLevelRecords: TypeLevelSelect[] = [
    { typeId: TYPE_ID_1, levelId: LEVEL_ID_1, createdAt: new Date() },
    { typeId: TYPE_ID_1, levelId: LEVEL_ID_2, createdAt: new Date() },
    { typeId: TYPE_ID_2, levelId: LEVEL_ID_3, createdAt: new Date() },
  ];

  beforeEach(() => {
    // Create mock database with chained query builder pattern
    const createChainedMock = (result: unknown) => {
      const chain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        then: vi.fn((resolve) => Promise.resolve(result).then(resolve)),
      };
      return vi.fn().mockReturnValue(chain);
    };

    mockDb = {
      select: createChainedMock([]),
      query: {
        types: {
          findFirst: vi.fn(),
          findMany: vi.fn(),
        },
        typeLevels: {
          findMany: vi.fn(),
        },
      },
    };

    repository = new PostgresTypeRepository(mockDb as unknown as PostgresTypeRepository['db']);
  });

  describe('findById', () => {
    it('should return type when found', async () => {
      mockDb.query.types.findFirst.mockResolvedValue(mockTypeRecord);
      mockDb.query.typeLevels.findMany.mockResolvedValue([
        mockTypeLevelRecords[0],
        mockTypeLevelRecords[1],
      ]);

      const result = await repository.findById(mockTypeRecord.id);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockTypeRecord.id);
      expect(result?.name).toBe('technical');
    });

    it('should return null when not found', async () => {
      mockDb.query.types.findFirst.mockResolvedValue(null);

      const result = await repository.findById('nonexistent-id');

      expect(result).toBeNull();
    });

    it('should call findFirst with correct id', async () => {
      mockDb.query.types.findFirst.mockResolvedValue(null);

      await repository.findById(mockTypeRecord.id);

      expect(mockDb.query.types.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.any(Function),
        })
      );
    });

    it('should include levelIds from type_levels junction table', async () => {
      mockDb.query.types.findFirst.mockResolvedValue(mockTypeRecord);
      mockDb.query.typeLevels.findMany.mockResolvedValue([
        { typeId: TYPE_ID_1, levelId: LEVEL_ID_1, createdAt: new Date() },
        { typeId: TYPE_ID_1, levelId: LEVEL_ID_2, createdAt: new Date() },
      ]);

      const result = await repository.findById(mockTypeRecord.id);

      expect(result).not.toBeNull();
      expect(result?.levelIds).toEqual([LEVEL_ID_1, LEVEL_ID_2]);
    });

    it('should return empty levelIds when type has no levels', async () => {
      mockDb.query.types.findFirst.mockResolvedValue(mockTypeRecord);
      mockDb.query.typeLevels.findMany.mockResolvedValue([]);

      const result = await repository.findById(mockTypeRecord.id);

      expect(result).not.toBeNull();
      expect(result?.levelIds).toEqual([]);
    });

    it('should load levelIds after finding the type', async () => {
      mockDb.query.types.findFirst.mockResolvedValue(mockTypeRecord);
      mockDb.query.typeLevels.findMany.mockResolvedValue([]);

      await repository.findById(mockTypeRecord.id);

      expect(mockDb.query.typeLevels.findMany).toHaveBeenCalled();
    });
  });

  describe('findByName', () => {
    it('should find type by exact name (lowercase)', async () => {
      mockDb.query.types.findFirst.mockResolvedValue(mockTypeRecord);
      mockDb.query.typeLevels.findMany.mockResolvedValue([]);

      const result = await repository.findByName('technical');

      expect(result).not.toBeNull();
      expect(result?.name).toBe('technical');
    });

    it('should find type by name case-insensitively', async () => {
      mockDb.query.types.findFirst.mockResolvedValue(mockTypeRecord);
      mockDb.query.typeLevels.findMany.mockResolvedValue([]);

      const result = await repository.findByName('TECHNICAL');

      expect(result).not.toBeNull();
      expect(result?.name).toBe('technical');
    });

    it('should find type by name with mixed case', async () => {
      mockDb.query.types.findFirst.mockResolvedValue(mockTypeRecord);
      mockDb.query.typeLevels.findMany.mockResolvedValue([]);

      const result = await repository.findByName('Technical');

      expect(result).not.toBeNull();
      expect(result?.name).toBe('technical');
    });

    it('should trim whitespace from name', async () => {
      mockDb.query.types.findFirst.mockResolvedValue(mockTypeRecord);
      mockDb.query.typeLevels.findMany.mockResolvedValue([]);

      await repository.findByName('  technical  ');

      expect(mockDb.query.types.findFirst).toHaveBeenCalled();
    });

    it('should return null when type not found', async () => {
      mockDb.query.types.findFirst.mockResolvedValue(null);

      const result = await repository.findByName('nonexistent');

      expect(result).toBeNull();
    });

    it('should return null for empty name', async () => {
      const result = await repository.findByName('');

      expect(result).toBeNull();
      expect(mockDb.query.types.findFirst).not.toHaveBeenCalled();
    });

    it('should return null for whitespace-only name', async () => {
      const result = await repository.findByName('   ');

      expect(result).toBeNull();
      expect(mockDb.query.types.findFirst).not.toHaveBeenCalled();
    });

    it('should include levelIds from type_levels junction table', async () => {
      mockDb.query.types.findFirst.mockResolvedValue(mockTypeRecord);
      mockDb.query.typeLevels.findMany.mockResolvedValue([
        { typeId: TYPE_ID_1, levelId: LEVEL_ID_1, createdAt: new Date() },
      ]);

      const result = await repository.findByName('technical');

      expect(result).not.toBeNull();
      expect(result?.levelIds).toEqual([LEVEL_ID_1]);
    });
  });

  describe('findAll', () => {
    it('should return all types', async () => {
      mockDb.query.types.findMany.mockResolvedValue([
        mockTypeRecord,
        mockTypeRecord2,
        mockTypeRecord3,
      ]);
      mockDb.query.typeLevels.findMany.mockResolvedValue(mockTypeLevelRecords);

      const result = await repository.findAll();

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('technical');
      expect(result[1].name).toBe('novel');
      expect(result[2].name).toBe('biography');
    });

    it('should return empty array when no types exist', async () => {
      mockDb.query.types.findMany.mockResolvedValue([]);

      const result = await repository.findAll();

      expect(result).toEqual([]);
    });

    it('should return domain entities with all properties', async () => {
      mockDb.query.types.findMany.mockResolvedValue([mockTypeRecord]);
      mockDb.query.typeLevels.findMany.mockResolvedValue([
        { typeId: TYPE_ID_1, levelId: LEVEL_ID_1, createdAt: new Date() },
      ]);

      const result = await repository.findAll();

      expect(result[0].id).toBe(mockTypeRecord.id);
      expect(result[0].name).toBe(mockTypeRecord.name);
      expect(result[0].createdAt).toEqual(mockTypeRecord.createdAt);
      expect(result[0].updatedAt).toEqual(mockTypeRecord.updatedAt);
    });

    it('should include levelIds for each type', async () => {
      mockDb.query.types.findMany.mockResolvedValue([mockTypeRecord, mockTypeRecord2]);
      mockDb.query.typeLevels.findMany.mockResolvedValue([
        { typeId: TYPE_ID_1, levelId: LEVEL_ID_1, createdAt: new Date() },
        { typeId: TYPE_ID_1, levelId: LEVEL_ID_2, createdAt: new Date() },
        { typeId: TYPE_ID_2, levelId: LEVEL_ID_3, createdAt: new Date() },
      ]);

      const result = await repository.findAll();

      expect(result[0].levelIds).toEqual([LEVEL_ID_1, LEVEL_ID_2]);
      expect(result[1].levelIds).toEqual([LEVEL_ID_3]);
    });

    it('should return empty levelIds for types with no levels', async () => {
      mockDb.query.types.findMany.mockResolvedValue([mockTypeRecord3]);
      mockDb.query.typeLevels.findMany.mockResolvedValue([]);

      const result = await repository.findAll();

      expect(result[0].levelIds).toEqual([]);
    });

    it('should not call typeLevels.findMany when no types found', async () => {
      mockDb.query.types.findMany.mockResolvedValue([]);

      await repository.findAll();

      expect(mockDb.query.typeLevels.findMany).not.toHaveBeenCalled();
    });
  });

  describe('findAllSorted', () => {
    it('should return all types sorted alphabetically by name', async () => {
      mockDb.query.types.findMany.mockResolvedValue([
        mockTypeRecord3, // biography
        mockTypeRecord2, // novel
        mockTypeRecord,  // technical
      ]);
      mockDb.query.typeLevels.findMany.mockResolvedValue(mockTypeLevelRecords);

      const result = await repository.findAllSorted();

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('biography');
      expect(result[1].name).toBe('novel');
      expect(result[2].name).toBe('technical');
    });

    it('should return empty array when no types exist', async () => {
      mockDb.query.types.findMany.mockResolvedValue([]);

      const result = await repository.findAllSorted();

      expect(result).toEqual([]);
    });

    it('should call findMany with orderBy configuration', async () => {
      mockDb.query.types.findMany.mockResolvedValue([]);

      await repository.findAllSorted();

      expect(mockDb.query.types.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: expect.any(Function),
        })
      );
    });

    it('should return domain entities with all properties including levelIds', async () => {
      mockDb.query.types.findMany.mockResolvedValue([mockTypeRecord]);
      mockDb.query.typeLevels.findMany.mockResolvedValue([
        { typeId: TYPE_ID_1, levelId: LEVEL_ID_1, createdAt: new Date() },
      ]);

      const result = await repository.findAllSorted();

      expect(result[0].id).toBe(mockTypeRecord.id);
      expect(result[0].name).toBe(mockTypeRecord.name);
      expect(result[0].createdAt).toEqual(mockTypeRecord.createdAt);
      expect(result[0].updatedAt).toEqual(mockTypeRecord.updatedAt);
      expect(result[0].levelIds).toEqual([LEVEL_ID_1]);
    });

    it('should include levelIds for each sorted type', async () => {
      mockDb.query.types.findMany.mockResolvedValue([mockTypeRecord3, mockTypeRecord]);
      mockDb.query.typeLevels.findMany.mockResolvedValue([
        { typeId: TYPE_ID_1, levelId: LEVEL_ID_1, createdAt: new Date() },
        { typeId: TYPE_ID_1, levelId: LEVEL_ID_2, createdAt: new Date() },
      ]);

      const result = await repository.findAllSorted();

      expect(result[0].name).toBe('biography');
      expect(result[0].levelIds).toEqual([]);
      expect(result[1].name).toBe('technical');
      expect(result[1].levelIds).toEqual([LEVEL_ID_1, LEVEL_ID_2]);
    });

    it('should not call typeLevels.findMany when no types found', async () => {
      mockDb.query.types.findMany.mockResolvedValue([]);

      await repository.findAllSorted();

      expect(mockDb.query.typeLevels.findMany).not.toHaveBeenCalled();
    });
  });

  describe('count', () => {
    it('should return total count of types', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockResolvedValue([{ count: '3' }]),
      });
      mockDb.select = mockSelect;

      const result = await repository.count();

      expect(result).toBe(3);
    });

    it('should return 0 when no types exist', async () => {
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
  });

  describe('TypeMapper integration', () => {
    it('should correctly map database record to domain entity with levelIds', async () => {
      mockDb.query.types.findFirst.mockResolvedValue(mockTypeRecord);
      mockDb.query.typeLevels.findMany.mockResolvedValue([
        { typeId: TYPE_ID_1, levelId: LEVEL_ID_1, createdAt: new Date() },
        { typeId: TYPE_ID_1, levelId: LEVEL_ID_2, createdAt: new Date() },
      ]);

      const result = await repository.findById(mockTypeRecord.id);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(mockTypeRecord.id);
      expect(result!.name).toBe(mockTypeRecord.name);
      expect(result!.createdAt).toEqual(mockTypeRecord.createdAt);
      expect(result!.updatedAt).toEqual(mockTypeRecord.updatedAt);
      expect(result!.levelIds).toEqual([LEVEL_ID_1, LEVEL_ID_2]);
    });

    it('should map multiple records correctly with their respective levelIds', async () => {
      mockDb.query.types.findMany.mockResolvedValue([
        mockTypeRecord,
        mockTypeRecord2,
      ]);
      mockDb.query.typeLevels.findMany.mockResolvedValue([
        { typeId: TYPE_ID_1, levelId: LEVEL_ID_1, createdAt: new Date() },
        { typeId: TYPE_ID_2, levelId: LEVEL_ID_3, createdAt: new Date() },
      ]);

      const result = await repository.findAll();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(mockTypeRecord.id);
      expect(result[0].name).toBe(mockTypeRecord.name);
      expect(result[0].levelIds).toEqual([LEVEL_ID_1]);
      expect(result[1].id).toBe(mockTypeRecord2.id);
      expect(result[1].name).toBe(mockTypeRecord2.name);
      expect(result[1].levelIds).toEqual([LEVEL_ID_3]);
    });

    it('should enable hasLevel method on returned BookType', async () => {
      mockDb.query.types.findFirst.mockResolvedValue(mockTypeRecord);
      mockDb.query.typeLevels.findMany.mockResolvedValue([
        { typeId: TYPE_ID_1, levelId: LEVEL_ID_1, createdAt: new Date() },
      ]);

      const result = await repository.findById(mockTypeRecord.id);

      expect(result).not.toBeNull();
      expect(result!.hasLevel(LEVEL_ID_1)).toBe(true);
      expect(result!.hasLevel(LEVEL_ID_2)).toBe(false);
    });
  });
});
