/**
 * PostgresBookRepository Unit Tests
 *
 * HU-008: Updated to use levelId (UUID FK to levels table) instead of level (BookLevel enum).
 * Also updated Category and BookType fixtures to include required HU-008 fields.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  PostgresBookRepository,
  normalizeForDuplicateCheck,
} from '../../../../../src/infrastructure/driven/persistence/PostgresBookRepository.js';
import { Book } from '../../../../../src/domain/entities/Book.js';
import { Author } from '../../../../../src/domain/entities/Author.js';
import { BookType } from '../../../../../src/domain/entities/BookType.js';
import { Category } from '../../../../../src/domain/entities/Category.js';
import {
  DuplicateISBNError,
  BookNotFoundError,
} from '../../../../../src/domain/errors/DomainErrors.js';
import type { BookSelect, CategorySelect, AuthorSelect, TypeSelect } from '../../../../../src/infrastructure/driven/persistence/drizzle/schema.js';

// Mock Drizzle database
interface MockDb {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  query: {
    books: {
      findFirst: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
    types: {
      findFirst: ReturnType<typeof vi.fn>;
    };
    typeLevels: {
      findMany: ReturnType<typeof vi.fn>;
    };
  };
  transaction: ReturnType<typeof vi.fn>;
}

describe('PostgresBookRepository', () => {
  let mockDb: MockDb;
  let repository: PostgresBookRepository;

  // Test UUIDs
  const categoryId = '550e8400-e29b-41d4-a716-446655440010';
  const authorId = '550e8400-e29b-41d4-a716-446655440020';
  const typeId = '550e8400-e29b-41d4-a716-446655440030';
  const bookId = '550e8400-e29b-41d4-a716-446655440001';
  const levelId = '550e8400-e29b-41d4-a716-446655440040';
  const levelId2 = '550e8400-e29b-41d4-a716-446655440041';

  // Sample category for testing (HU-008: includes typeId)
  const mockCategory = Category.fromPersistence({
    id: categoryId,
    name: 'programming',
    typeId: typeId,
    description: 'Books about programming',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  });

  const mockCategoryRecord: CategorySelect = {
    id: categoryId,
    name: 'programming',
    typeId: typeId,
    description: 'Books about programming',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };

  // Sample author for testing
  const mockAuthor = Author.fromPersistence({
    id: authorId,
    name: 'Robert C. Martin',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  });

  const mockAuthorRecord: AuthorSelect = {
    id: authorId,
    name: 'Robert C. Martin',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };

  // Sample book type for testing (HU-008: includes levelIds)
  const mockBookType = BookType.fromPersistence({
    id: typeId,
    name: 'technical',
    levelIds: [levelId, levelId2],
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  });

  const mockBookTypeRecord: TypeSelect = {
    id: typeId,
    name: 'technical',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };

  // HU-008: type_levels junction records for mockBookType
  const mockTypeLevelRecords = [
    { typeId: typeId, levelId: levelId, createdAt: new Date('2026-01-01T00:00:00Z') },
    { typeId: typeId, levelId: levelId2, createdAt: new Date('2026-01-01T00:00:00Z') },
  ];

  // Sample book database record (HU-008: levelId instead of level)
  const mockBookRecord: BookSelect = {
    id: bookId,
    isbn: '9780132350884',
    title: 'Clean Code',
    description: 'A Handbook of Agile Software Craftsmanship',
    typeId: typeId,
    format: 'pdf',
    levelId: levelId, // HU-008: UUID FK to levels table
    available: true,
    path: '/books/clean-code.pdf',
    embedding: Array(768).fill(0.1),
    normalizedTitle: 'clean code',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };

  // Sample book domain entity (HU-008: levelId instead of level)
  const createMockBook = (overrides: { levelId?: string | null } = {}) =>
    Book.fromPersistence({
      id: bookId,
      isbn: '9780132350884',
      title: 'Clean Code',
      authors: [mockAuthor],
      description: 'A Handbook of Agile Software Craftsmanship',
      type: mockBookType,
      format: 'pdf',
      levelId: overrides.levelId !== undefined ? overrides.levelId : levelId, // HU-008: UUID FK
      categories: [mockCategory],
      available: true,
      path: '/books/clean-code.pdf',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    });

  beforeEach(() => {
    // Create mock database with chained query builder pattern
    const createChainedMock = (result: unknown) => {
      const chain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue(result),
        then: vi.fn((resolve) => Promise.resolve(result).then(resolve)),
      };
      return vi.fn().mockReturnValue(chain);
    };

    mockDb = {
      select: createChainedMock([]),
      insert: createChainedMock([]),
      update: createChainedMock([]),
      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue({ rowCount: 1 }),
      }),
      query: {
        books: {
          findFirst: vi.fn(),
          findMany: vi.fn(),
        },
        types: {
          findFirst: vi.fn().mockResolvedValue(mockBookTypeRecord),
        },
        typeLevels: {
          findMany: vi.fn().mockResolvedValue(mockTypeLevelRecords),
        },
      },
      transaction: vi.fn((fn) => fn(mockDb)),
    };

    repository = new PostgresBookRepository(mockDb as unknown as PostgresBookRepository['db']);
  });

  describe('normalizeForDuplicateCheck', () => {
    it('should convert to lowercase', () => {
      expect(normalizeForDuplicateCheck('HELLO WORLD')).toBe('hello world');
    });

    it('should remove diacritical marks', () => {
      expect(normalizeForDuplicateCheck('Café résumé')).toBe('cafe resume');
    });

    it('should remove special characters', () => {
      expect(normalizeForDuplicateCheck('Hello, World!')).toBe('hello world');
    });

    it('should normalize multiple spaces', () => {
      expect(normalizeForDuplicateCheck('hello    world')).toBe('hello world');
    });

    it('should trim whitespace', () => {
      expect(normalizeForDuplicateCheck('  hello world  ')).toBe('hello world');
    });

    it('should handle complex text', () => {
      expect(normalizeForDuplicateCheck("  Robert C. Martin's  ")).toBe('robert c martins');
    });

    it('should handle Spanish text with accents', () => {
      expect(normalizeForDuplicateCheck('García Márquez')).toBe('garcia marquez');
    });
  });

  describe('findById', () => {
    it('should return book when found', async () => {
      mockDb.query.books.findFirst.mockResolvedValue(mockBookRecord);
      mockDb.query.types.findFirst.mockResolvedValue(mockBookTypeRecord);
      mockDb.query.typeLevels.findMany.mockResolvedValue(mockTypeLevelRecords);

      // Mock select for authors, types, and categories fetches
      // The repository calls select().from().innerJoin().where() for each relation
      let callCount = 0;
      const selectChain = {
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockImplementation(() => {
          callCount++;
          // First call: authors, Second call: categories
          if (callCount === 1) {
            return Promise.resolve([{ authors: mockAuthorRecord }]);
          }
          return Promise.resolve([{ categories: mockCategoryRecord }]);
        }),
      };
      mockDb.select.mockReturnValue(selectChain);

      const result = await repository.findById(mockBookRecord.id);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockBookRecord.id);
      expect(result?.title).toBe('Clean Code');
      expect(result?.levelId).toBe(levelId); // HU-008: Now levelId (UUID)
      expect(result?.authors).toHaveLength(1);
      expect(result?.authors[0].name).toBe('Robert C. Martin');
      expect(result?.type.name).toBe('technical');
      expect(result?.type.levelIds).toContain(levelId); // HU-008: Type has levelIds
      expect(result?.categories).toHaveLength(1);
    });

    it('should return book with null levelId when levelId is null in database (HU-008)', async () => {
      const recordWithNullLevelId = { ...mockBookRecord, levelId: null };
      mockDb.query.books.findFirst.mockResolvedValue(recordWithNullLevelId);
      mockDb.query.types.findFirst.mockResolvedValue(mockBookTypeRecord);
      mockDb.query.typeLevels.findMany.mockResolvedValue(mockTypeLevelRecords);

      let callCount = 0;
      const selectChain = {
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve([{ authors: mockAuthorRecord }]);
          }
          return Promise.resolve([{ categories: mockCategoryRecord }]);
        }),
      };
      mockDb.select.mockReturnValue(selectChain);

      const result = await repository.findById(mockBookRecord.id);

      expect(result).not.toBeNull();
      expect(result?.levelId).toBeNull(); // HU-008: Now levelId (UUID or null)
    });

    it('should return null when not found', async () => {
      mockDb.query.books.findFirst.mockResolvedValue(null);

      const result = await repository.findById('nonexistent-id');

      expect(result).toBeNull();
    });

    it('should return book with type that has empty levelIds (HU-008)', async () => {
      const typeRecordNoLevels: TypeSelect = { ...mockBookTypeRecord };
      mockDb.query.books.findFirst.mockResolvedValue(mockBookRecord);
      mockDb.query.types.findFirst.mockResolvedValue(typeRecordNoLevels);
      mockDb.query.typeLevels.findMany.mockResolvedValue([]); // No levels for this type

      let callCount = 0;
      const selectChain = {
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve([{ authors: mockAuthorRecord }]);
          }
          return Promise.resolve([{ categories: mockCategoryRecord }]);
        }),
      };
      mockDb.select.mockReturnValue(selectChain);

      const result = await repository.findById(mockBookRecord.id);

      expect(result).not.toBeNull();
      expect(result?.type.levelIds).toHaveLength(0); // HU-008: No levels for this type
    });
  });

  describe('findByIsbn', () => {
    it('should return book when found by ISBN', async () => {
      mockDb.query.books.findFirst.mockResolvedValue(mockBookRecord);
      mockDb.query.types.findFirst.mockResolvedValue(mockBookTypeRecord);
      mockDb.query.typeLevels.findMany.mockResolvedValue(mockTypeLevelRecords);

      let callCount = 0;
      const selectChain = {
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve([{ authors: mockAuthorRecord }]);
          }
          return Promise.resolve([{ categories: mockCategoryRecord }]);
        }),
      };
      mockDb.select.mockReturnValue(selectChain);

      const result = await repository.findByIsbn('9780132350884');

      expect(result).not.toBeNull();
      expect(result?.isbn?.value).toBe('9780132350884');
      expect(result?.levelId).toBe(levelId); // HU-008: Verify levelId is mapped
    });

    it('should return null when ISBN not found', async () => {
      mockDb.query.books.findFirst.mockResolvedValue(null);

      const result = await repository.findByIsbn('9999999999999');

      expect(result).toBeNull();
    });
  });

  describe('existsByIsbn', () => {
    it('should return true when ISBN exists', async () => {
      const selectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 1 }]),
      };
      mockDb.select.mockReturnValue(selectChain);

      const result = await repository.existsByIsbn('9780132350884');

      expect(result).toBe(true);
    });

    it('should return false when ISBN does not exist', async () => {
      const selectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 0 }]),
      };
      mockDb.select.mockReturnValue(selectChain);

      const result = await repository.existsByIsbn('9999999999999');

      expect(result).toBe(false);
    });
  });

  describe('checkDuplicate', () => {
    it('should detect ISBN duplicate', async () => {
      // existsByIsbn returns true
      const selectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 1 }]),
      };
      mockDb.select.mockReturnValue(selectChain);

      const result = await repository.checkDuplicate({
        isbn: '9780132350884',
      });

      expect(result.isDuplicate).toBe(true);
      expect(result.duplicateType).toBe('isbn');
      expect(result.message).toContain('9780132350884');
    });

    it('should return no duplicate when ISBN does not exist', async () => {
      const selectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 0 }]),
      };
      mockDb.select.mockReturnValue(selectChain);

      const result = await repository.checkDuplicate({
        isbn: '9781234567890',
      });

      expect(result.isDuplicate).toBe(false);
      expect(result.duplicateType).toBeUndefined();
    });

    it('should return no duplicate when no ISBN provided', async () => {
      const result = await repository.checkDuplicate({});

      expect(result.isDuplicate).toBe(false);
      expect(result.duplicateType).toBeUndefined();
    });

    it('should return no duplicate when ISBN is null', async () => {
      const result = await repository.checkDuplicate({ isbn: null });

      expect(result.isDuplicate).toBe(false);
      expect(result.duplicateType).toBeUndefined();
    });
  });

  describe('save', () => {
    it('should save book with embedding, authors, and categories', async () => {
      const book = createMockBook();
      const embedding = Array(768).fill(0.1);

      // Mock transaction - the insert chain for books
      const bookInsertChain = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockBookRecord]),
      };

      // Mock insert chain for book_authors
      const authorInsertChain = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([]),
      };

      // Mock insert chain for book_categories
      const categoryInsertChain = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([]),
      };

      mockDb.insert
        .mockReturnValueOnce(bookInsertChain)
        .mockReturnValueOnce(authorInsertChain)
        .mockReturnValueOnce(categoryInsertChain);

      const result = await repository.save({ book, embedding });

      expect(result.id).toBe(book.id);
      expect(result.title).toBe('Clean Code');
      expect(result.levelId).toBe(levelId); // HU-008: Verify levelId is preserved
    });

    it('should save book with null levelId (HU-008)', async () => {
      const book = createMockBook({ levelId: null });
      const embedding = Array(768).fill(0.1);

      const recordWithNullLevelId = { ...mockBookRecord, levelId: null };

      const bookInsertChain = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([recordWithNullLevelId]),
      };

      const authorInsertChain = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([]),
      };

      const categoryInsertChain = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([]),
      };

      mockDb.insert
        .mockReturnValueOnce(bookInsertChain)
        .mockReturnValueOnce(authorInsertChain)
        .mockReturnValueOnce(categoryInsertChain);

      const result = await repository.save({ book, embedding });

      expect(result.id).toBe(book.id);
      expect(result.levelId).toBeNull();
    });

    it('should throw DuplicateISBNError on ISBN conflict', async () => {
      const book = createMockBook();
      const embedding = Array(768).fill(0.1);

      const bookInsertChain = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockRejectedValue(
          new Error('duplicate key value violates unique constraint "books_isbn_unique_idx"')
        ),
      };
      mockDb.insert.mockReturnValue(bookInsertChain);

      await expect(repository.save({ book, embedding })).rejects.toThrow(DuplicateISBNError);
    });

    it('should throw DuplicateISBNError on generic duplicate key error', async () => {
      const book = createMockBook();
      const embedding = Array(768).fill(0.1);

      const bookInsertChain = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockRejectedValue(
          new Error('duplicate key value violates unique constraint')
        ),
      };
      mockDb.insert.mockReturnValue(bookInsertChain);

      await expect(repository.save({ book, embedding })).rejects.toThrow(DuplicateISBNError);
    });
  });

  describe('update', () => {
    it('should update available field', async () => {
      const updatedRecord = { ...mockBookRecord, available: false };
      const updateChain = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([updatedRecord]),
      };
      mockDb.update.mockReturnValue(updateChain);
      mockDb.query.types.findFirst.mockResolvedValue(mockBookTypeRecord);
      mockDb.query.typeLevels.findMany.mockResolvedValue(mockTypeLevelRecords);

      // Mock select for authors and categories fetch
      let callCount = 0;
      const selectChain = {
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve([{ authors: mockAuthorRecord }]);
          }
          return Promise.resolve([{ categories: mockCategoryRecord }]);
        }),
      };
      mockDb.select.mockReturnValue(selectChain);

      const result = await repository.update({
        id: mockBookRecord.id,
        available: false,
      });

      expect(result.available).toBe(false);
      expect(result.levelId).toBe(levelId); // HU-008: levelId unchanged
    });

    it('should update path field', async () => {
      const updatedRecord = { ...mockBookRecord, path: '/new/path.pdf' };
      const updateChain = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([updatedRecord]),
      };
      mockDb.update.mockReturnValue(updateChain);
      mockDb.query.types.findFirst.mockResolvedValue(mockBookTypeRecord);
      mockDb.query.typeLevels.findMany.mockResolvedValue(mockTypeLevelRecords);

      let callCount = 0;
      const selectChain = {
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve([{ authors: mockAuthorRecord }]);
          }
          return Promise.resolve([{ categories: mockCategoryRecord }]);
        }),
      };
      mockDb.select.mockReturnValue(selectChain);

      const result = await repository.update({
        id: mockBookRecord.id,
        path: '/new/path.pdf',
      });

      expect(result.path).toBe('/new/path.pdf');
    });

    it('should throw BookNotFoundError when book does not exist', async () => {
      const updateChain = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([]),
      };
      mockDb.update.mockReturnValue(updateChain);

      await expect(
        repository.update({ id: 'nonexistent-id', available: false })
      ).rejects.toThrow(BookNotFoundError);
    });
  });

  describe('delete', () => {
    it('should return true when book is deleted', async () => {
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue({ rowCount: 1 }),
      });

      const result = await repository.delete(mockBookRecord.id);

      expect(result).toBe(true);
    });

    it('should return false when book does not exist', async () => {
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue({ rowCount: 0 }),
      });

      const result = await repository.delete('nonexistent-id');

      expect(result).toBe(false);
    });
  });

  describe('findAll', () => {
    it('should return all books with authors, type, and categories', async () => {
      mockDb.query.books.findMany.mockResolvedValue([mockBookRecord]);
      mockDb.query.types.findFirst.mockResolvedValue(mockBookTypeRecord);
      mockDb.query.typeLevels.findMany.mockResolvedValue(mockTypeLevelRecords);

      let callCount = 0;
      const selectChain = {
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve([{ authors: mockAuthorRecord }]);
          }
          return Promise.resolve([{ categories: mockCategoryRecord }]);
        }),
      };
      mockDb.select.mockReturnValue(selectChain);

      const result = await repository.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Clean Code');
      expect(result[0].levelId).toBe(levelId); // HU-008: Verify levelId is mapped
      expect(result[0].authors).toHaveLength(1);
      expect(result[0].type.name).toBe('technical');
      expect(result[0].type.levelIds).toContain(levelId); // HU-008: Type has levelIds
      expect(result[0].categories).toHaveLength(1);
    });

    it('should return empty array when no books', async () => {
      mockDb.query.books.findMany.mockResolvedValue([]);

      const result = await repository.findAll();

      expect(result).toEqual([]);
    });

    it('should return books with different levelIds (HU-008)', async () => {
      const record1 = { ...mockBookRecord, id: 'book-1', levelId: levelId };
      const record2 = { ...mockBookRecord, id: 'book-2', levelId: levelId2 };
      const record3 = { ...mockBookRecord, id: 'book-3', levelId: null };

      mockDb.query.books.findMany.mockResolvedValue([record1, record2, record3]);
      mockDb.query.types.findFirst.mockResolvedValue(mockBookTypeRecord);
      mockDb.query.typeLevels.findMany.mockResolvedValue(mockTypeLevelRecords);

      const selectChain = {
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockImplementation(() => {
          return Promise.resolve([{ authors: mockAuthorRecord }]);
        }),
      };

      // Mock for categories (every other call)
      let categoryCallCount = 0;
      const categorySelectChain = {
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockImplementation(() => {
          return Promise.resolve([{ categories: mockCategoryRecord }]);
        }),
      };

      // Alternate between authors and categories for each book
      mockDb.select.mockImplementation(() => {
        categoryCallCount++;
        if (categoryCallCount % 2 === 1) {
          return selectChain;
        }
        return categorySelectChain;
      });

      const result = await repository.findAll();

      expect(result).toHaveLength(3);
      expect(result[0].levelId).toBe(levelId);
      expect(result[1].levelId).toBe(levelId2);
      expect(result[2].levelId).toBeNull();
    });
  });

  describe('count', () => {
    it('should return total book count', async () => {
      const selectChain = {
        from: vi.fn().mockResolvedValue([{ count: 42 }]),
      };
      mockDb.select.mockReturnValue(selectChain);

      const result = await repository.count();

      expect(result).toBe(42);
    });

    it('should return 0 when no books', async () => {
      const selectChain = {
        from: vi.fn().mockResolvedValue([{ count: 0 }]),
      };
      mockDb.select.mockReturnValue(selectChain);

      const result = await repository.count();

      expect(result).toBe(0);
    });
  });
});
