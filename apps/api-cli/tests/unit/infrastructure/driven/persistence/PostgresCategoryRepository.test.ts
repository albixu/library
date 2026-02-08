import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PostgresCategoryRepository } from '../../../../../src/infrastructure/driven/persistence/PostgresCategoryRepository.js';
import { Category } from '../../../../../src/domain/entities/Category.js';
import { CategoryAlreadyExistsError } from '../../../../../src/domain/errors/DomainErrors.js';
import type { CategorySelect } from '../../../../../src/infrastructure/driven/persistence/drizzle/schema.js';

// Mock Drizzle database
type MockDb = {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  query: {
    categories: {
      findFirst: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
  };
};

describe('PostgresCategoryRepository', () => {
  let mockDb: MockDb;
  let repository: PostgresCategoryRepository;

  // Sample database records
  const mockCategoryRecord: CategorySelect = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'programming',
    description: 'Books about programming',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };

  const mockCategoryRecord2: CategorySelect = {
    id: '550e8400-e29b-41d4-a716-446655440002',
    name: 'software engineering',
    description: null,
    createdAt: new Date('2026-01-02T00:00:00Z'),
    updatedAt: new Date('2026-01-02T00:00:00Z'),
  };

  beforeEach(() => {
    // Create mock database with chained query builder pattern
    const createChainedMock = (result: unknown) => {
      const chain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        onConflictDoNothing: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue(result),
        then: vi.fn((resolve) => Promise.resolve(result).then(resolve)),
      };
      return vi.fn().mockReturnValue(chain);
    };

    mockDb = {
      select: createChainedMock([]),
      insert: createChainedMock([]),
      query: {
        categories: {
          findFirst: vi.fn(),
          findMany: vi.fn(),
        },
      },
    };

    repository = new PostgresCategoryRepository(mockDb as unknown as PostgresCategoryRepository['db']);
  });

  describe('findById', () => {
    it('should return category when found', async () => {
      mockDb.query.categories.findFirst.mockResolvedValue(mockCategoryRecord);

      const result = await repository.findById(mockCategoryRecord.id);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockCategoryRecord.id);
      expect(result?.name).toBe('programming');
    });

    it('should return null when not found', async () => {
      mockDb.query.categories.findFirst.mockResolvedValue(null);

      const result = await repository.findById('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('findByName', () => {
    it('should find category by name (case-insensitive)', async () => {
      mockDb.query.categories.findFirst.mockResolvedValue(mockCategoryRecord);

      const result = await repository.findByName('PROGRAMMING');

      expect(result).not.toBeNull();
      expect(result?.name).toBe('programming');
    });

    it('should return null when not found', async () => {
      mockDb.query.categories.findFirst.mockResolvedValue(null);

      const result = await repository.findByName('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByNames', () => {
    it('should find multiple categories by names', async () => {
      mockDb.query.categories.findMany.mockResolvedValue([
        mockCategoryRecord,
        mockCategoryRecord2,
      ]);

      const result = await repository.findByNames(['programming', 'software engineering']);

      expect(result).toHaveLength(2);
    });

    it('should return empty array when no names provided', async () => {
      const result = await repository.findByNames([]);

      expect(result).toEqual([]);
      expect(mockDb.query.categories.findMany).not.toHaveBeenCalled();
    });

    it('should return only found categories', async () => {
      mockDb.query.categories.findMany.mockResolvedValue([mockCategoryRecord]);

      const result = await repository.findByNames(['programming', 'nonexistent']);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('programming');
    });
  });

  describe('findOrCreate', () => {
    it('should return existing category if found', async () => {
      mockDb.query.categories.findFirst.mockResolvedValue(mockCategoryRecord);

      const result = await repository.findOrCreate('programming');

      expect(result.id).toBe(mockCategoryRecord.id);
      expect(result.name).toBe('programming');
    });

    it('should create new category if not found', async () => {
      mockDb.query.categories.findFirst.mockResolvedValue(null);

      const insertChain = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{
          id: '550e8400-e29b-41d4-a716-446655440099',
          name: 'new category',
          description: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }]),
      };
      mockDb.insert.mockReturnValue(insertChain);

      const result = await repository.findOrCreate('New Category');

      expect(result.name).toBe('new category');
    });
  });

  describe('findOrCreateMany', () => {
    it('should find existing and create new categories', async () => {
      // First find existing
      mockDb.query.categories.findMany.mockResolvedValue([mockCategoryRecord]);

      // Then insert new ones
      const insertChain = {
        values: vi.fn().mockReturnThis(),
        onConflictDoNothing: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{
          id: '550e8400-e29b-41d4-a716-446655440099',
          name: 'new category',
          description: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }]),
      };
      mockDb.insert.mockReturnValue(insertChain);

      const result = await repository.findOrCreateMany(['programming', 'new category']);

      expect(result).toHaveLength(2);
    });

    it('should return empty array for empty input', async () => {
      const result = await repository.findOrCreateMany([]);

      expect(result).toEqual([]);
    });

    it('should maintain order of input names', async () => {
      mockDb.query.categories.findMany.mockResolvedValue([
        mockCategoryRecord2, // software engineering
        mockCategoryRecord,  // programming
      ]);

      const result = await repository.findOrCreateMany(['programming', 'software engineering']);

      // Should be in input order, not DB return order
      expect(result[0].name).toBe('programming');
      expect(result[1].name).toBe('software engineering');
    });
  });

  describe('save', () => {
    it('should save a new category', async () => {
      const newCategory = Category.create({
        id: '550e8400-e29b-41d4-a716-446655440099',
        name: 'new category',
      });

      const insertChain = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{
          id: newCategory.id,
          name: newCategory.name,
          description: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }]),
      };
      mockDb.insert.mockReturnValue(insertChain);

      const result = await repository.save(newCategory);

      expect(result.id).toBe(newCategory.id);
    });

    it('should throw CategoryAlreadyExistsError on duplicate', async () => {
      const duplicateCategory = Category.create({
        id: '550e8400-e29b-41d4-a716-446655440099',
        name: 'programming', // Already exists
      });

      const insertChain = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockRejectedValue(new Error('duplicate key value violates unique constraint')),
      };
      mockDb.insert.mockReturnValue(insertChain);

      await expect(repository.save(duplicateCategory)).rejects.toThrow(CategoryAlreadyExistsError);
    });
  });

  describe('saveMany', () => {
    it('should save multiple categories', async () => {
      const categories = [
        Category.create({ id: '550e8400-e29b-41d4-a716-446655440097', name: 'cat1' }),
        Category.create({ id: '550e8400-e29b-41d4-a716-446655440098', name: 'cat2' }),
      ];

      const insertChain = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([]),
      };
      mockDb.insert.mockReturnValue(insertChain);

      await expect(repository.saveMany(categories)).resolves.not.toThrow();
    });

    it('should do nothing for empty array', async () => {
      await expect(repository.saveMany([])).resolves.not.toThrow();
      expect(mockDb.insert).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all categories', async () => {
      mockDb.query.categories.findMany.mockResolvedValue([
        mockCategoryRecord,
        mockCategoryRecord2,
      ]);

      const result = await repository.findAll();

      expect(result).toHaveLength(2);
    });

    it('should return empty array when no categories', async () => {
      mockDb.query.categories.findMany.mockResolvedValue([]);

      const result = await repository.findAll();

      expect(result).toEqual([]);
    });
  });
});
