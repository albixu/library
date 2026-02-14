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
  DuplicateBookError,
  BookNotFoundError,
} from '../../../../../src/domain/errors/DomainErrors.js';
import type { BookSelect, CategorySelect } from '../../../../../src/infrastructure/driven/persistence/drizzle/schema.js';

// Mock Drizzle database
type MockDb = {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  query: {
    books: {
      findFirst: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
  };
  transaction: ReturnType<typeof vi.fn>;
};

describe('PostgresBookRepository', () => {
  let mockDb: MockDb;
  let repository: PostgresBookRepository;

  // Sample category for testing
  const mockCategory = Category.fromPersistence({
    id: '550e8400-e29b-41d4-a716-446655440010',
    name: 'programming',
    description: 'Books about programming',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  });

  const mockCategoryRecord: CategorySelect = {
    id: '550e8400-e29b-41d4-a716-446655440010',
    name: 'programming',
    description: 'Books about programming',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };

  // Sample author for testing
  const mockAuthor = Author.fromPersistence({
    id: '550e8400-e29b-41d4-a716-446655440020',
    name: 'Robert C. Martin',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  });

  // Sample book type for testing
  const mockBookType = BookType.fromPersistence({
    id: '550e8400-e29b-41d4-a716-446655440030',
    name: 'technical',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  });

  // Sample book database record
  const mockBookRecord: BookSelect = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    isbn: '9780132350884',
    title: 'Clean Code',
    author: 'Robert C. Martin',
    description: 'A Handbook of Agile Software Craftsmanship',
    type: 'technical',
    format: 'pdf',
    available: true,
    path: '/books/clean-code.pdf',
    embedding: Array(768).fill(0.1),
    normalizedTitle: 'clean code',
    normalizedAuthor: 'robert c martin',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };

  // Sample book domain entity
  const createMockBook = () =>
    Book.fromPersistence({
      id: '550e8400-e29b-41d4-a716-446655440001',
      isbn: '9780132350884',
      title: 'Clean Code',
      authors: [mockAuthor],
      description: 'A Handbook of Agile Software Craftsmanship',
      type: mockBookType,
      format: 'pdf',
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

      // Mock the categories fetch
      const selectChain = {
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ categories: mockCategoryRecord }]),
      };
      mockDb.select.mockReturnValue(selectChain);

      const result = await repository.findById(mockBookRecord.id);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockBookRecord.id);
      expect(result?.title).toBe('Clean Code');
      expect(result?.categories).toHaveLength(1);
    });

    it('should return null when not found', async () => {
      mockDb.query.books.findFirst.mockResolvedValue(null);

      const result = await repository.findById('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('findByIsbn', () => {
    it('should return book when found by ISBN', async () => {
      mockDb.query.books.findFirst.mockResolvedValue(mockBookRecord);

      const selectChain = {
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ categories: mockCategoryRecord }]),
      };
      mockDb.select.mockReturnValue(selectChain);

      const result = await repository.findByIsbn('9780132350884');

      expect(result).not.toBeNull();
      expect(result?.isbn?.value).toBe('9780132350884');
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

  describe('existsByTriad', () => {
    it('should return true when triad exists', async () => {
      const selectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 1 }]),
      };
      mockDb.select.mockReturnValue(selectChain);

      const result = await repository.existsByTriad('robert c martin', 'clean code', 'pdf');

      expect(result).toBe(true);
    });

    it('should return false when triad does not exist', async () => {
      const selectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 0 }]),
      };
      mockDb.select.mockReturnValue(selectChain);

      const result = await repository.existsByTriad('unknown author', 'unknown title', 'pdf');

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
        author: 'robert c martin',
        title: 'clean code',
        format: 'pdf',
      });

      expect(result.isDuplicate).toBe(true);
      expect(result.duplicateType).toBe('isbn');
      expect(result.message).toContain('9780132350884');
    });

    it('should detect triad duplicate when no ISBN', async () => {
      const selectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 1 }]),
      };
      mockDb.select.mockReturnValue(selectChain);

      const result = await repository.checkDuplicate({
        author: 'robert c martin',
        title: 'clean code',
        format: 'pdf',
      });

      expect(result.isDuplicate).toBe(true);
      expect(result.duplicateType).toBe('triad');
    });

    it('should return no duplicate when book is unique', async () => {
      const selectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 0 }]),
      };
      mockDb.select.mockReturnValue(selectChain);

      const result = await repository.checkDuplicate({
        isbn: '9781234567890',
        author: 'new author',
        title: 'new title',
        format: 'epub',
      });

      expect(result.isDuplicate).toBe(false);
      expect(result.duplicateType).toBeUndefined();
    });
  });

  describe('save', () => {
    it('should save book with embedding and categories', async () => {
      const book = createMockBook();
      const embedding = Array(768).fill(0.1);

      // Mock transaction - the insert chain for books
      const bookInsertChain = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockBookRecord]),
      };

      // Mock insert chain for book_categories
      const categoryInsertChain = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([]),
      };

      mockDb.insert
        .mockReturnValueOnce(bookInsertChain)
        .mockReturnValueOnce(categoryInsertChain);

      const result = await repository.save({ book, embedding });

      expect(result.id).toBe(book.id);
      expect(result.title).toBe('Clean Code');
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

    it('should throw DuplicateBookError on triad conflict', async () => {
      const book = createMockBook();
      const embedding = Array(768).fill(0.1);

      const bookInsertChain = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockRejectedValue(
          new Error('duplicate key value violates unique constraint "books_triad_unique_idx"')
        ),
      };
      mockDb.insert.mockReturnValue(bookInsertChain);

      await expect(repository.save({ book, embedding })).rejects.toThrow(DuplicateBookError);
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

      // Mock categories fetch
      const selectChain = {
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ categories: mockCategoryRecord }]),
      };
      mockDb.select.mockReturnValue(selectChain);

      const result = await repository.update({
        id: mockBookRecord.id,
        available: false,
      });

      expect(result.available).toBe(false);
    });

    it('should update path field', async () => {
      const updatedRecord = { ...mockBookRecord, path: '/new/path.pdf' };
      const updateChain = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([updatedRecord]),
      };
      mockDb.update.mockReturnValue(updateChain);

      const selectChain = {
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ categories: mockCategoryRecord }]),
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
    it('should return all books with categories', async () => {
      mockDb.query.books.findMany.mockResolvedValue([mockBookRecord]);

      const selectChain = {
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ categories: mockCategoryRecord }]),
      };
      mockDb.select.mockReturnValue(selectChain);

      const result = await repository.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Clean Code');
      expect(result[0].categories).toHaveLength(1);
    });

    it('should return empty array when no books', async () => {
      mockDb.query.books.findMany.mockResolvedValue([]);

      const result = await repository.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('count', () => {
    it('should return total book count', async () => {
      const selectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 42 }]),
      };
      mockDb.select.mockReturnValue(selectChain);

      const result = await repository.count();

      expect(result).toBe(42);
    });

    it('should return 0 when no books', async () => {
      const selectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 0 }]),
      };
      mockDb.select.mockReturnValue(selectChain);

      const result = await repository.count();

      expect(result).toBe(0);
    });
  });
});
