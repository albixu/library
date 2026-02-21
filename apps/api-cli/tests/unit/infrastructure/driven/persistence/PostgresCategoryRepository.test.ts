import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PostgresCategoryRepository } from '../../../../../src/infrastructure/driven/persistence/PostgresCategoryRepository.js';
import { Category } from '../../../../../src/domain/entities/Category.js';
import { CategoryAlreadyExistsError } from '../../../../../src/domain/errors/DomainErrors.js';
import type { CategorySelect } from '../../../../../src/infrastructure/driven/persistence/drizzle/schema.js';

// Mock Drizzle database
interface MockDb {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  query: {
    categories: {
      findFirst: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
  };
}

describe('PostgresCategoryRepository', () => {
  let mockDb: MockDb;
  let repository: PostgresCategoryRepository;

  // Test UUIDs
  const TYPE_ID_BOOK = '550e8400-e29b-41d4-a716-446655440100';
  const TYPE_ID_COURSE = '550e8400-e29b-41d4-a716-446655440200';

  // Sample database records - HU-008: Now include typeId
  const mockCategoryRecord: CategorySelect = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'programming',
    description: 'Books about programming',
    typeId: TYPE_ID_BOOK,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };

  const mockCategoryRecord2: CategorySelect = {
    id: '550e8400-e29b-41d4-a716-446655440002',
    name: 'software engineering',
    description: null,
    typeId: TYPE_ID_BOOK,
    createdAt: new Date('2026-01-02T00:00:00Z'),
    updatedAt: new Date('2026-01-02T00:00:00Z'),
  };

  const mockCategoryRecordDifferentType: CategorySelect = {
    id: '550e8400-e29b-41d4-a716-446655440003',
    name: 'programming',
    description: 'Courses about programming',
    typeId: TYPE_ID_COURSE,
    createdAt: new Date('2026-01-03T00:00:00Z'),
    updatedAt: new Date('2026-01-03T00:00:00Z'),
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
      expect(result?.typeId).toBe(TYPE_ID_BOOK);
    });

    it('should return null when not found', async () => {
      mockDb.query.categories.findFirst.mockResolvedValue(null);

      const result = await repository.findById('nonexistent-id');

      expect(result).toBeNull();
    });

    it('should include typeId in the returned category', async () => {
      mockDb.query.categories.findFirst.mockResolvedValue(mockCategoryRecord);

      const result = await repository.findById(mockCategoryRecord.id);

      expect(result?.typeId).toBe(TYPE_ID_BOOK);
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

    it('should include typeId in the returned category', async () => {
      mockDb.query.categories.findFirst.mockResolvedValue(mockCategoryRecord);

      const result = await repository.findByName('programming');

      expect(result?.typeId).toBe(TYPE_ID_BOOK);
    });
  });

  describe('findByNameAndTypeId', () => {
    it('should find category by name and type (case-insensitive)', async () => {
      mockDb.query.categories.findFirst.mockResolvedValue(mockCategoryRecord);

      const result = await repository.findByNameAndTypeId('PROGRAMMING', TYPE_ID_BOOK);

      expect(result).not.toBeNull();
      expect(result?.name).toBe('programming');
      expect(result?.typeId).toBe(TYPE_ID_BOOK);
    });

    it('should return null when name matches but type does not', async () => {
      mockDb.query.categories.findFirst.mockResolvedValue(null);

      const result = await repository.findByNameAndTypeId('programming', 'non-existent-type-id');

      expect(result).toBeNull();
    });

    it('should return null when not found', async () => {
      mockDb.query.categories.findFirst.mockResolvedValue(null);

      const result = await repository.findByNameAndTypeId('nonexistent', TYPE_ID_BOOK);

      expect(result).toBeNull();
    });

    it('should find correct category when same name exists in different types', async () => {
      // When searching for programming in COURSE type
      mockDb.query.categories.findFirst.mockResolvedValue(mockCategoryRecordDifferentType);

      const result = await repository.findByNameAndTypeId('programming', TYPE_ID_COURSE);

      expect(result).not.toBeNull();
      expect(result?.name).toBe('programming');
      expect(result?.typeId).toBe(TYPE_ID_COURSE);
      expect(result?.description).toBe('Courses about programming');
    });

    it('should trim and lowercase name for case-insensitive search', async () => {
      mockDb.query.categories.findFirst.mockResolvedValue(mockCategoryRecord);

      const result = await repository.findByNameAndTypeId('  PROGRAMMING  ', TYPE_ID_BOOK);

      expect(result).not.toBeNull();
      expect(result?.name).toBe('programming');
    });
  });

  describe('findByTypeId', () => {
    it('should return all categories for a given type', async () => {
      mockDb.query.categories.findMany.mockResolvedValue([
        mockCategoryRecord,
        mockCategoryRecord2,
      ]);

      const result = await repository.findByTypeId(TYPE_ID_BOOK);

      expect(result).toHaveLength(2);
      expect(result.every(c => c.typeId === TYPE_ID_BOOK)).toBe(true);
    });

    it('should return empty array when type has no categories', async () => {
      mockDb.query.categories.findMany.mockResolvedValue([]);

      const result = await repository.findByTypeId('type-with-no-categories');

      expect(result).toEqual([]);
    });

    it('should only return categories for the specified type', async () => {
      mockDb.query.categories.findMany.mockResolvedValue([mockCategoryRecordDifferentType]);

      const result = await repository.findByTypeId(TYPE_ID_COURSE);

      expect(result).toHaveLength(1);
      expect(result[0].typeId).toBe(TYPE_ID_COURSE);
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

    it('should include typeId in returned categories', async () => {
      mockDb.query.categories.findMany.mockResolvedValue([mockCategoryRecord]);

      const result = await repository.findByNames(['programming']);

      expect(result[0].typeId).toBe(TYPE_ID_BOOK);
    });
  });

  describe('findOrCreate', () => {
    it('should return existing category if found', async () => {
      mockDb.query.categories.findFirst.mockResolvedValue(mockCategoryRecord);

      const result = await repository.findOrCreate('programming', TYPE_ID_BOOK);

      expect(result.id).toBe(mockCategoryRecord.id);
      expect(result.name).toBe('programming');
      expect(result.typeId).toBe(TYPE_ID_BOOK);
    });

    it('should create new category with typeId if not found', async () => {
      mockDb.query.categories.findFirst.mockResolvedValue(null);

      const insertChain = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{
          id: '550e8400-e29b-41d4-a716-446655440099',
          name: 'new category',
          description: null,
          typeId: TYPE_ID_BOOK,
          createdAt: new Date(),
          updatedAt: new Date(),
        }]),
      };
      mockDb.insert.mockReturnValue(insertChain);

      const result = await repository.findOrCreate('New Category', TYPE_ID_BOOK);

      expect(result.name).toBe('new category');
      expect(result.typeId).toBe(TYPE_ID_BOOK);
    });

    it('should allow same category name in different types', async () => {
      // First call: search for programming in COURSE type - not found
      mockDb.query.categories.findFirst.mockResolvedValue(null);

      const insertChain = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{
          id: '550e8400-e29b-41d4-a716-446655440099',
          name: 'programming',
          description: null,
          typeId: TYPE_ID_COURSE,
          createdAt: new Date(),
          updatedAt: new Date(),
        }]),
      };
      mockDb.insert.mockReturnValue(insertChain);

      const result = await repository.findOrCreate('programming', TYPE_ID_COURSE);

      expect(result.name).toBe('programming');
      expect(result.typeId).toBe(TYPE_ID_COURSE);
    });

    it('should handle concurrent creation by returning existing category', async () => {
      // First call - not found
      mockDb.query.categories.findFirst
        .mockResolvedValueOnce(null)
        // Second call after insert fails - found (created by another process)
        .mockResolvedValueOnce(mockCategoryRecord);

      const insertChain = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockRejectedValue(new Error('duplicate key value violates unique constraint')),
      };
      mockDb.insert.mockReturnValue(insertChain);

      const result = await repository.findOrCreate('programming', TYPE_ID_BOOK);

      expect(result.id).toBe(mockCategoryRecord.id);
      expect(result.name).toBe('programming');
    });
  });

  describe('findOrCreateMany', () => {
    it('should find existing and create new categories with typeId', async () => {
      const newCategoryRecord: CategorySelect = {
        id: '550e8400-e29b-41d4-a716-446655440099',
        name: 'new category',
        description: null,
        typeId: TYPE_ID_BOOK,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // First findMany call - only existing categories
      mockDb.query.categories.findMany.mockResolvedValueOnce([mockCategoryRecord]);

      // Insert new ones
      const insertChain = {
        values: vi.fn().mockReturnThis(),
        onConflictDoNothing: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([newCategoryRecord]),
      };
      mockDb.insert.mockReturnValue(insertChain);

      // Second findMany call after insert - all categories
      mockDb.query.categories.findMany.mockResolvedValueOnce([
        mockCategoryRecord,
        newCategoryRecord,
      ]);

      const result = await repository.findOrCreateMany(['programming', 'new category'], TYPE_ID_BOOK);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('programming');
      expect(result[0].typeId).toBe(TYPE_ID_BOOK);
      expect(result[1].name).toBe('new category');
      expect(result[1].typeId).toBe(TYPE_ID_BOOK);
    });

    it('should return empty array for empty input', async () => {
      const result = await repository.findOrCreateMany([], TYPE_ID_BOOK);

      expect(result).toEqual([]);
    });

    it('should maintain order of input names', async () => {
      // First call - all already exist
      mockDb.query.categories.findMany.mockResolvedValueOnce([
        mockCategoryRecord2, // software engineering
        mockCategoryRecord,  // programming
      ]);

      // Second call after insert (no insert needed) - same data
      mockDb.query.categories.findMany.mockResolvedValueOnce([
        mockCategoryRecord2,
        mockCategoryRecord,
      ]);

      const result = await repository.findOrCreateMany(['programming', 'software engineering'], TYPE_ID_BOOK);

      // Should be in input order, not DB return order
      expect(result[0].name).toBe('programming');
      expect(result[1].name).toBe('software engineering');
    });

    it('should scope categories to the given typeId', async () => {
      const courseCategory: CategorySelect = {
        id: '550e8400-e29b-41d4-a716-446655440099',
        name: 'programming',
        description: null,
        typeId: TYPE_ID_COURSE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // First findMany - no categories for this type
      mockDb.query.categories.findMany.mockResolvedValueOnce([]);

      // Insert new one
      const insertChain = {
        values: vi.fn().mockReturnThis(),
        onConflictDoNothing: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([courseCategory]),
      };
      mockDb.insert.mockReturnValue(insertChain);

      // Second findMany - now has the category
      mockDb.query.categories.findMany.mockResolvedValueOnce([courseCategory]);

      const result = await repository.findOrCreateMany(['programming'], TYPE_ID_COURSE);

      expect(result).toHaveLength(1);
      expect(result[0].typeId).toBe(TYPE_ID_COURSE);
    });

    it('should handle race condition where concurrent writer inserts category', async () => {
      const concurrentCategoryRecord: CategorySelect = {
        id: '550e8400-e29b-41d4-a716-446655440099',
        name: 'concurrent category',
        description: null,
        typeId: TYPE_ID_BOOK,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // First findMany - category doesn't exist yet
      mockDb.query.categories.findMany.mockResolvedValueOnce([]);

      // Insert attempt with onConflictDoNothing - returns empty because concurrent writer won
      const insertChain = {
        values: vi.fn().mockReturnThis(),
        onConflictDoNothing: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([]), // Empty - conflict occurred
      };
      mockDb.insert.mockReturnValue(insertChain);

      // Second findMany after insert - now the category exists (inserted by concurrent writer)
      mockDb.query.categories.findMany.mockResolvedValueOnce([concurrentCategoryRecord]);

      const result = await repository.findOrCreateMany(['concurrent category'], TYPE_ID_BOOK);

      // Should successfully return the category despite the race condition
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('concurrent category');
      expect(result[0].id).toBe(concurrentCategoryRecord.id);
      expect(result[0].typeId).toBe(TYPE_ID_BOOK);
    });

    it('should throw error if categories cannot be found or created', async () => {
      // First findMany - category doesn't exist
      mockDb.query.categories.findMany.mockResolvedValueOnce([]);

      // Insert attempt fails
      const insertChain = {
        values: vi.fn().mockReturnThis(),
        onConflictDoNothing: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([]),
      };
      mockDb.insert.mockReturnValue(insertChain);

      // Second findMany after insert - still doesn't exist (unexpected situation)
      mockDb.query.categories.findMany.mockResolvedValueOnce([]);

      await expect(repository.findOrCreateMany(['missing category'], TYPE_ID_BOOK))
        .rejects.toThrow('Failed to find or create the requested categories: missing category');
    });
  });

  describe('save', () => {
    it('should save a new category with typeId', async () => {
      const newCategory = Category.create({
        id: '550e8400-e29b-41d4-a716-446655440099',
        name: 'new category',
        typeId: TYPE_ID_BOOK,
      });

      const insertChain = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{
          id: newCategory.id,
          name: newCategory.name,
          description: null,
          typeId: TYPE_ID_BOOK,
          createdAt: new Date(),
          updatedAt: new Date(),
        }]),
      };
      mockDb.insert.mockReturnValue(insertChain);

      const result = await repository.save(newCategory);

      expect(result.id).toBe(newCategory.id);
      expect(result.typeId).toBe(TYPE_ID_BOOK);
    });

    it('should throw CategoryAlreadyExistsError on duplicate', async () => {
      const duplicateCategory = Category.create({
        id: '550e8400-e29b-41d4-a716-446655440099',
        name: 'programming',
        typeId: TYPE_ID_BOOK,
      });

      const insertChain = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockRejectedValue(new Error('duplicate key value violates unique constraint')),
      };
      mockDb.insert.mockReturnValue(insertChain);

      await expect(repository.save(duplicateCategory)).rejects.toThrow(CategoryAlreadyExistsError);
    });

    it('should allow saving category with same name but different typeId', async () => {
      const categoryForCourse = Category.create({
        id: '550e8400-e29b-41d4-a716-446655440099',
        name: 'programming',
        typeId: TYPE_ID_COURSE,
      });

      const insertChain = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{
          id: categoryForCourse.id,
          name: categoryForCourse.name,
          description: null,
          typeId: TYPE_ID_COURSE,
          createdAt: new Date(),
          updatedAt: new Date(),
        }]),
      };
      mockDb.insert.mockReturnValue(insertChain);

      const result = await repository.save(categoryForCourse);

      expect(result.name).toBe('programming');
      expect(result.typeId).toBe(TYPE_ID_COURSE);
    });
  });

  describe('saveMany', () => {
    it('should save multiple categories with typeId', async () => {
      const categories = [
        Category.create({ id: '550e8400-e29b-41d4-a716-446655440097', name: 'cat1', typeId: TYPE_ID_BOOK }),
        Category.create({ id: '550e8400-e29b-41d4-a716-446655440098', name: 'cat2', typeId: TYPE_ID_BOOK }),
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

    it('should save categories for different types', async () => {
      const categories = [
        Category.create({ id: '550e8400-e29b-41d4-a716-446655440097', name: 'cat1', typeId: TYPE_ID_BOOK }),
        Category.create({ id: '550e8400-e29b-41d4-a716-446655440098', name: 'cat1', typeId: TYPE_ID_COURSE }),
      ];

      const insertChain = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([]),
      };
      mockDb.insert.mockReturnValue(insertChain);

      await expect(repository.saveMany(categories)).resolves.not.toThrow();
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

    it('should include typeId in all returned categories', async () => {
      mockDb.query.categories.findMany.mockResolvedValue([
        mockCategoryRecord,
        mockCategoryRecord2,
        mockCategoryRecordDifferentType,
      ]);

      const result = await repository.findAll();

      expect(result).toHaveLength(3);
      expect(result[0].typeId).toBe(TYPE_ID_BOOK);
      expect(result[1].typeId).toBe(TYPE_ID_BOOK);
      expect(result[2].typeId).toBe(TYPE_ID_COURSE);
    });
  });

  describe('count', () => {
    it('should return the count of categories', async () => {
      const selectChain = {
        from: vi.fn().mockResolvedValue([{ count: 5 }]),
      };
      mockDb.select.mockReturnValue(selectChain);

      const result = await repository.count();

      expect(result).toBe(5);
    });

    it('should return 0 when no categories', async () => {
      const selectChain = {
        from: vi.fn().mockResolvedValue([{ count: 0 }]),
      };
      mockDb.select.mockReturnValue(selectChain);

      const result = await repository.count();

      expect(result).toBe(0);
    });
  });
});
