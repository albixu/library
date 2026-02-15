import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PostgresAuthorRepository } from '../../../../../src/infrastructure/driven/persistence/PostgresAuthorRepository.js';
import { Author } from '../../../../../src/domain/entities/Author.js';
import { AuthorAlreadyExistsError } from '../../../../../src/domain/errors/DomainErrors.js';
import type { AuthorSelect } from '../../../../../src/infrastructure/driven/persistence/drizzle/schema.js';

// Mock Drizzle database
type MockDb = {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  query: {
    authors: {
      findFirst: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
  };
};

describe('PostgresAuthorRepository', () => {
  let mockDb: MockDb;
  let repository: PostgresAuthorRepository;

  // Sample database records
  const mockAuthorRecord: AuthorSelect = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'Robert C. Martin',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };

  const mockAuthorRecord2: AuthorSelect = {
    id: '550e8400-e29b-41d4-a716-446655440002',
    name: 'Martin Fowler',
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
        authors: {
          findFirst: vi.fn(),
          findMany: vi.fn(),
        },
      },
    };

    repository = new PostgresAuthorRepository(mockDb as unknown as PostgresAuthorRepository['db']);
  });

  describe('findById', () => {
    it('should return author when found', async () => {
      mockDb.query.authors.findFirst.mockResolvedValue(mockAuthorRecord);

      const result = await repository.findById(mockAuthorRecord.id);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockAuthorRecord.id);
      expect(result?.name).toBe('Robert C. Martin');
    });

    it('should return null when not found', async () => {
      mockDb.query.authors.findFirst.mockResolvedValue(null);

      const result = await repository.findById('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('findByName', () => {
    it('should find author by exact name', async () => {
      mockDb.query.authors.findFirst.mockResolvedValue(mockAuthorRecord);

      const result = await repository.findByName('Robert C. Martin');

      expect(result).not.toBeNull();
      expect(result?.name).toBe('Robert C. Martin');
    });

    it('should trim whitespace from name', async () => {
      mockDb.query.authors.findFirst.mockResolvedValue(mockAuthorRecord);

      await repository.findByName('  Robert C. Martin  ');

      expect(mockDb.query.authors.findFirst).toHaveBeenCalled();
    });

    it('should return null when not found', async () => {
      mockDb.query.authors.findFirst.mockResolvedValue(null);

      const result = await repository.findByName('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByNames', () => {
    it('should find multiple authors by names', async () => {
      mockDb.query.authors.findMany.mockResolvedValue([
        mockAuthorRecord,
        mockAuthorRecord2,
      ]);

      const result = await repository.findByNames(['Robert C. Martin', 'Martin Fowler']);

      expect(result).toHaveLength(2);
    });

    it('should return empty array when no names provided', async () => {
      const result = await repository.findByNames([]);

      expect(result).toEqual([]);
      expect(mockDb.query.authors.findMany).not.toHaveBeenCalled();
    });

    it('should return only found authors', async () => {
      mockDb.query.authors.findMany.mockResolvedValue([mockAuthorRecord]);

      const result = await repository.findByNames(['Robert C. Martin', 'nonexistent']);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Robert C. Martin');
    });
  });

  describe('findOrCreate', () => {
    it('should return existing author if found', async () => {
      mockDb.query.authors.findFirst.mockResolvedValue(mockAuthorRecord);

      const result = await repository.findOrCreate('Robert C. Martin');

      expect(result.id).toBe(mockAuthorRecord.id);
      expect(result.name).toBe('Robert C. Martin');
    });

    it('should create new author if not found', async () => {
      mockDb.query.authors.findFirst.mockResolvedValue(null);

      const insertChain = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{
          id: '550e8400-e29b-41d4-a716-446655440099',
          name: 'New Author',
          createdAt: new Date(),
          updatedAt: new Date(),
        }]),
      };
      mockDb.insert.mockReturnValue(insertChain);

      const result = await repository.findOrCreate('New Author');

      expect(result.name).toBe('New Author');
    });

    it('should handle concurrent creation gracefully', async () => {
      // First check returns null (author doesn't exist)
      mockDb.query.authors.findFirst
        .mockResolvedValueOnce(null)
        // Second check (after insert fails) returns existing author
        .mockResolvedValueOnce(mockAuthorRecord);

      const insertChain = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockRejectedValue(new Error('duplicate key value violates unique constraint')),
      };
      mockDb.insert.mockReturnValue(insertChain);

      const result = await repository.findOrCreate('Robert C. Martin');

      expect(result.name).toBe('Robert C. Martin');
    });
  });

  describe('findOrCreateMany', () => {
    it('should find existing and create new authors', async () => {
      const newAuthorRecord: AuthorSelect = {
        id: '550e8400-e29b-41d4-a716-446655440099',
        name: 'New Author',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // First findByNames call - only existing authors
      mockDb.query.authors.findMany.mockResolvedValueOnce([mockAuthorRecord]);

      // Insert new ones
      const insertChain = {
        values: vi.fn().mockReturnThis(),
        onConflictDoNothing: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([newAuthorRecord]),
      };
      mockDb.insert.mockReturnValue(insertChain);

      // Second findByNames call after insert - all authors
      mockDb.query.authors.findMany.mockResolvedValueOnce([
        mockAuthorRecord,
        newAuthorRecord,
      ]);

      const result = await repository.findOrCreateMany(['Robert C. Martin', 'New Author']);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Robert C. Martin');
      expect(result[1].name).toBe('New Author');
    });

    it('should return empty array for empty input', async () => {
      const result = await repository.findOrCreateMany([]);

      expect(result).toEqual([]);
    });

    it('should maintain order of input names', async () => {
      // First call - all already exist
      mockDb.query.authors.findMany.mockResolvedValueOnce([
        mockAuthorRecord2, // Martin Fowler
        mockAuthorRecord,  // Robert C. Martin
      ]);

      // Second call after insert (no insert needed) - same data
      mockDb.query.authors.findMany.mockResolvedValueOnce([
        mockAuthorRecord2,
        mockAuthorRecord,
      ]);

      const result = await repository.findOrCreateMany(['Robert C. Martin', 'Martin Fowler']);

      // Should be in input order, not DB return order
      expect(result[0].name).toBe('Robert C. Martin');
      expect(result[1].name).toBe('Martin Fowler');
    });

    it('should handle race condition where concurrent writer inserts author', async () => {
      const concurrentAuthorRecord: AuthorSelect = {
        id: '550e8400-e29b-41d4-a716-446655440099',
        name: 'Concurrent Author',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // First findByNames - author doesn't exist yet
      mockDb.query.authors.findMany.mockResolvedValueOnce([]);

      // Insert attempt with onConflictDoNothing - returns empty because concurrent writer won
      const insertChain = {
        values: vi.fn().mockReturnThis(),
        onConflictDoNothing: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([]), // Empty - conflict occurred
      };
      mockDb.insert.mockReturnValue(insertChain);

      // Second findByNames after insert - now the author exists (inserted by concurrent writer)
      mockDb.query.authors.findMany.mockResolvedValueOnce([concurrentAuthorRecord]);

      const result = await repository.findOrCreateMany(['Concurrent Author']);

      // Should successfully return the author despite the race condition
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Concurrent Author');
      expect(result[0].id).toBe(concurrentAuthorRecord.id);
    });

    it('should throw error if authors cannot be found or created', async () => {
      // First findByNames - author doesn't exist
      mockDb.query.authors.findMany.mockResolvedValueOnce([]);

      // Insert attempt fails
      const insertChain = {
        values: vi.fn().mockReturnThis(),
        onConflictDoNothing: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([]),
      };
      mockDb.insert.mockReturnValue(insertChain);

      // Second findByNames after insert - still doesn't exist (unexpected situation)
      mockDb.query.authors.findMany.mockResolvedValueOnce([]);

      await expect(repository.findOrCreateMany(['missing author']))
        .rejects.toThrow('Failed to find or create the requested authors: missing author');
    });
  });

  describe('save', () => {
    it('should save a new author', async () => {
      const newAuthor = Author.create({
        id: '550e8400-e29b-41d4-a716-446655440099',
        name: 'New Author',
      });

      const insertChain = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{
          id: newAuthor.id,
          name: newAuthor.name,
          createdAt: new Date(),
          updatedAt: new Date(),
        }]),
      };
      mockDb.insert.mockReturnValue(insertChain);

      const result = await repository.save(newAuthor);

      expect(result.id).toBe(newAuthor.id);
    });

    it('should throw AuthorAlreadyExistsError on duplicate', async () => {
      const duplicateAuthor = Author.create({
        id: '550e8400-e29b-41d4-a716-446655440099',
        name: 'Robert C. Martin', // Already exists
      });

      const insertChain = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockRejectedValue(new Error('duplicate key value violates unique constraint')),
      };
      mockDb.insert.mockReturnValue(insertChain);

      await expect(repository.save(duplicateAuthor)).rejects.toThrow(AuthorAlreadyExistsError);
    });

    it('should throw error when insert returns no record', async () => {
      const newAuthor = Author.create({
        id: '550e8400-e29b-41d4-a716-446655440099',
        name: 'New Author',
      });

      const insertChain = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([]),
      };
      mockDb.insert.mockReturnValue(insertChain);

      await expect(repository.save(newAuthor)).rejects.toThrow('Failed to insert author - no record returned');
    });
  });

  describe('findAll', () => {
    it('should return all authors', async () => {
      mockDb.query.authors.findMany.mockResolvedValue([
        mockAuthorRecord,
        mockAuthorRecord2,
      ]);

      const result = await repository.findAll();

      expect(result).toHaveLength(2);
    });

    it('should return empty array when no authors', async () => {
      mockDb.query.authors.findMany.mockResolvedValue([]);

      const result = await repository.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('count', () => {
    it('should return the count of authors', async () => {
      const selectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([mockAuthorRecord, mockAuthorRecord2]),
      };
      mockDb.select.mockReturnValue(selectChain);

      const result = await repository.count();

      expect(result).toBe(2);
    });

    it('should return 0 when no authors', async () => {
      const selectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      };
      mockDb.select.mockReturnValue(selectChain);

      const result = await repository.count();

      expect(result).toBe(0);
    });
  });
});
