import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PostgresTypeRepository } from '../../../../../src/infrastructure/driven/persistence/PostgresTypeRepository.js';
import type { TypeSelect } from '../../../../../src/infrastructure/driven/persistence/drizzle/schema.js';

// Mock Drizzle database
type MockDb = {
  select: ReturnType<typeof vi.fn>;
  query: {
    types: {
      findFirst: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
  };
};

describe('PostgresTypeRepository', () => {
  let mockDb: MockDb;
  let repository: PostgresTypeRepository;

  // Sample database records
  const mockTypeRecord: TypeSelect = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'technical',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };

  const mockTypeRecord2: TypeSelect = {
    id: '550e8400-e29b-41d4-a716-446655440002',
    name: 'novel',
    createdAt: new Date('2026-01-02T00:00:00Z'),
    updatedAt: new Date('2026-01-02T00:00:00Z'),
  };

  const mockTypeRecord3: TypeSelect = {
    id: '550e8400-e29b-41d4-a716-446655440003',
    name: 'biography',
    createdAt: new Date('2026-01-03T00:00:00Z'),
    updatedAt: new Date('2026-01-03T00:00:00Z'),
  };

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
      },
    };

    repository = new PostgresTypeRepository(mockDb as unknown as PostgresTypeRepository['db']);
  });

  describe('findById', () => {
    it('should return type when found', async () => {
      mockDb.query.types.findFirst.mockResolvedValue(mockTypeRecord);

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
  });

  describe('findByName', () => {
    it('should find type by exact name (lowercase)', async () => {
      mockDb.query.types.findFirst.mockResolvedValue(mockTypeRecord);

      const result = await repository.findByName('technical');

      expect(result).not.toBeNull();
      expect(result?.name).toBe('technical');
    });

    it('should find type by name case-insensitively', async () => {
      mockDb.query.types.findFirst.mockResolvedValue(mockTypeRecord);

      const result = await repository.findByName('TECHNICAL');

      expect(result).not.toBeNull();
      expect(result?.name).toBe('technical');
    });

    it('should find type by name with mixed case', async () => {
      mockDb.query.types.findFirst.mockResolvedValue(mockTypeRecord);

      const result = await repository.findByName('Technical');

      expect(result).not.toBeNull();
      expect(result?.name).toBe('technical');
    });

    it('should trim whitespace from name', async () => {
      mockDb.query.types.findFirst.mockResolvedValue(mockTypeRecord);

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
  });

  describe('findAll', () => {
    it('should return all types', async () => {
      mockDb.query.types.findMany.mockResolvedValue([
        mockTypeRecord,
        mockTypeRecord2,
        mockTypeRecord3,
      ]);

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

      const result = await repository.findAll();

      expect(result[0].id).toBe(mockTypeRecord.id);
      expect(result[0].name).toBe(mockTypeRecord.name);
      expect(result[0].createdAt).toEqual(mockTypeRecord.createdAt);
      expect(result[0].updatedAt).toEqual(mockTypeRecord.updatedAt);
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
    it('should correctly map database record to domain entity', async () => {
      mockDb.query.types.findFirst.mockResolvedValue(mockTypeRecord);

      const result = await repository.findById(mockTypeRecord.id);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(mockTypeRecord.id);
      expect(result!.name).toBe(mockTypeRecord.name);
      expect(result!.createdAt).toEqual(mockTypeRecord.createdAt);
      expect(result!.updatedAt).toEqual(mockTypeRecord.updatedAt);
    });

    it('should map multiple records correctly', async () => {
      mockDb.query.types.findMany.mockResolvedValue([
        mockTypeRecord,
        mockTypeRecord2,
      ]);

      const result = await repository.findAll();

      expect(result).toHaveLength(2);
      result.forEach((type, index) => {
        const expectedRecord = index === 0 ? mockTypeRecord : mockTypeRecord2;
        expect(type.id).toBe(expectedRecord.id);
        expect(type.name).toBe(expectedRecord.name);
      });
    });
  });
});
