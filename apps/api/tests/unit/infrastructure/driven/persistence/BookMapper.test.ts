/**
 * BookMapper Unit Tests
 *
 * Tests for the Book entity mapper that converts between
 * domain entities and database records.
 *
 * HU-008: Tests updated to verify levelId (UUID FK) mapping
 * instead of the previous level (BookLevel enum) mapping.
 *
 * HU-013: Tests updated to verify originalDescription and language mapping.
 */

import { describe, it, expect } from 'vitest';
import { BookMapper, type BookWithRelations, type BookToPersistenceParams } from '../../../../../src/infrastructure/driven/persistence/mappers/BookMapper.js';
import { Book } from '../../../../../src/domain/entities/Book.js';
import { Author } from '../../../../../src/domain/entities/Author.js';
import { BookType } from '../../../../../src/domain/entities/BookType.js';
import { Category } from '../../../../../src/domain/entities/Category.js';
import type { BookSelect } from '../../../../../src/infrastructure/driven/persistence/drizzle/schema.js';

describe('BookMapper', () => {
  // Test fixtures - UUIDs
  const bookId = '550e8400-e29b-41d4-a716-446655440001';
  const authorId = '550e8400-e29b-41d4-a716-446655440002';
  const authorId2 = '550e8400-e29b-41d4-a716-446655440003';
  const typeId = '550e8400-e29b-41d4-a716-446655440004';
  const categoryId = '550e8400-e29b-41d4-a716-446655440005';
  const categoryId2 = '550e8400-e29b-41d4-a716-446655440006';
  const levelId = '550e8400-e29b-41d4-a716-446655440007';
  const levelId2 = '550e8400-e29b-41d4-a716-446655440008';

  // Timestamps
  const createdAt = new Date('2026-01-01T00:00:00Z');
  const updatedAt = new Date('2026-01-15T00:00:00Z');

  // Helper to create mock Author entities
  const createMockAuthor = (id: string, name: string): Author => {
    return Author.fromPersistence({
      id,
      name,
      createdAt,
      updatedAt,
    });
  };

  // Helper to create mock BookType entities
  const createMockBookType = (id: string, name: string, levelIds: string[] = []): BookType => {
    return BookType.fromPersistence({
      id,
      name,
      levelIds,
      createdAt,
      updatedAt,
    });
  };

  // Helper to create mock Category entities
  const createMockCategory = (id: string, name: string, catTypeId: string): Category => {
    return Category.fromPersistence({
      id,
      name,
      typeId: catTypeId,
      description: null,
      createdAt,
      updatedAt,
    });
  };

  // Mock database record
  // HU-013: Added originalDescription and language fields
  const createMockDbRecord = (overrides: Partial<BookSelect> = {}): BookSelect => ({
    id: bookId,
    isbn: '9781234567890',
    title: 'Clean Architecture',
    originalDescription: 'A great book about software architecture', // HU-013
    description: 'Un gran libro sobre arquitectura de software', // HU-013: Spanish
    language: 'en', // HU-013: ISO 639-1 code
    typeId: typeId,
    format: 'pdf',
    levelId: levelId, // HU-008: UUID FK to levels table
    available: true,
    path: '/books/clean-arch.pdf',
    embedding: null,
    normalizedTitle: 'clean architecture',
    createdAt,
    updatedAt,
    ...overrides,
  });

  // Mock entities for testing
  const mockAuthors = [createMockAuthor(authorId, 'Robert C. Martin')];
  const mockType = createMockBookType(typeId, 'technical', [levelId, levelId2]);
  const mockCategories = [createMockCategory(categoryId, 'architecture', typeId)];

  describe('toDomain', () => {
    it('should convert database record to Book entity', () => {
      const record = createMockDbRecord();

      const result = BookMapper.toDomain(record, mockAuthors, mockType, mockCategories);

      expect(result).toBeInstanceOf(Book);
      expect(result.id).toBe(bookId);
      expect(result.title).toBe('Clean Architecture');
      expect(result.originalDescription).toBe('A great book about software architecture'); // HU-013
      expect(result.description).toBe('Un gran libro sobre arquitectura de software'); // HU-013: Spanish
      expect(result.language).toBe('en'); // HU-013
      expect(result.isbn?.value).toBe('9781234567890');
      expect(result.format.value).toBe('pdf');
      expect(result.available).toBe(true);
      expect(result.path).toBe('/books/clean-arch.pdf');
    });

    it('should map levelId as UUID FK (HU-008)', () => {
      const record = createMockDbRecord({ levelId: levelId });

      const result = BookMapper.toDomain(record, mockAuthors, mockType, mockCategories);

      expect(result.levelId).toBe(levelId);
    });

    it('should handle null levelId (HU-008)', () => {
      const record = createMockDbRecord({ levelId: null });

      const result = BookMapper.toDomain(record, mockAuthors, mockType, mockCategories);

      expect(result.levelId).toBeNull();
    });

    it('should handle different levelId values (HU-008)', () => {
      const record1 = createMockDbRecord({ levelId: levelId });
      const record2 = createMockDbRecord({ levelId: levelId2 });

      const result1 = BookMapper.toDomain(record1, mockAuthors, mockType, mockCategories);
      const result2 = BookMapper.toDomain(record2, mockAuthors, mockType, mockCategories);

      expect(result1.levelId).toBe(levelId);
      expect(result2.levelId).toBe(levelId2);
    });

    it('should handle null ISBN', () => {
      const record = createMockDbRecord({ isbn: null });

      const result = BookMapper.toDomain(record, mockAuthors, mockType, mockCategories);

      expect(result.isbn).toBeNull();
    });

    it('should handle null path', () => {
      const record = createMockDbRecord({ path: null });

      const result = BookMapper.toDomain(record, mockAuthors, mockType, mockCategories);

      expect(result.path).toBeNull();
    });

    it('should associate authors correctly', () => {
      const authors = [
        createMockAuthor(authorId, 'Author One'),
        createMockAuthor(authorId2, 'Author Two'),
      ];
      const record = createMockDbRecord();

      const result = BookMapper.toDomain(record, authors, mockType, mockCategories);

      expect(result.authors).toHaveLength(2);
      expect(result.authors[0].name).toBe('Author One');
      expect(result.authors[1].name).toBe('Author Two');
    });

    it('should associate type correctly', () => {
      const type = createMockBookType(typeId, 'novel', []);
      const record = createMockDbRecord();

      const result = BookMapper.toDomain(record, mockAuthors, type, mockCategories);

      expect(result.type.id).toBe(typeId);
      expect(result.type.name).toBe('novel');
    });

    it('should associate categories correctly', () => {
      const categories = [
        createMockCategory(categoryId, 'Category One', typeId),
        createMockCategory(categoryId2, 'Category Two', typeId),
      ];
      const record = createMockDbRecord();

      const result = BookMapper.toDomain(record, mockAuthors, mockType, categories);

      expect(result.categories).toHaveLength(2);
      expect(result.categories[0].name).toBe('Category One');
      expect(result.categories[1].name).toBe('Category Two');
    });

    it('should preserve timestamps exactly', () => {
      const specificCreated = new Date('2025-06-15T10:30:00.000Z');
      const specificUpdated = new Date('2025-12-20T15:45:30.000Z');
      const record = createMockDbRecord({
        createdAt: specificCreated,
        updatedAt: specificUpdated,
      });

      const result = BookMapper.toDomain(record, mockAuthors, mockType, mockCategories);

      expect(result.createdAt.toISOString()).toBe(specificCreated.toISOString());
      expect(result.updatedAt.toISOString()).toBe(specificUpdated.toISOString());
    });

    it('should create immutable Book entity', () => {
      const record = createMockDbRecord();

      const result = BookMapper.toDomain(record, mockAuthors, mockType, mockCategories);

      expect(Object.isFrozen(result)).toBe(true);
    });

    it('should handle available false', () => {
      const record = createMockDbRecord({ available: false });

      const result = BookMapper.toDomain(record, mockAuthors, mockType, mockCategories);

      expect(result.available).toBe(false);
    });

    it('should handle all supported format values', () => {
      const formats = ['pdf', 'epub', 'mobi', 'physical'];

      for (const format of formats) {
        const record = createMockDbRecord({ format });
        const result = BookMapper.toDomain(record, mockAuthors, mockType, mockCategories);
        expect(result.format.value).toBe(format);
      }
    });
  });

  describe('toPersistence', () => {
    // Helper to create a domain Book
    // HU-013: Added originalDescription and language fields
    const createDomainBook = (overrides: { levelId?: string | null } = {}): Book => {
      return Book.fromPersistence({
        id: bookId,
        isbn: '9781234567890',
        title: 'Clean Architecture',
        originalDescription: 'A great book about software architecture', // HU-013
        description: 'Un gran libro sobre arquitectura de software', // HU-013: Spanish
        language: 'en', // HU-013
        authors: mockAuthors,
        type: mockType,
        categories: mockCategories,
        format: 'pdf',
        levelId: overrides.levelId !== undefined ? overrides.levelId : levelId,
        available: true,
        path: '/books/clean-arch.pdf',
        createdAt,
        updatedAt,
      });
    };

    it('should convert Book entity to database insert record', () => {
      const book = createDomainBook();
      const params: BookToPersistenceParams = {
        book,
        embedding: [0.1, 0.2, 0.3],
        normalizedTitle: 'clean architecture',
      };

      const result = BookMapper.toPersistence(params);

      expect(result.id).toBe(bookId);
      expect(result.isbn).toBe('9781234567890');
      expect(result.title).toBe('Clean Architecture');
      expect(result.originalDescription).toBe('A great book about software architecture'); // HU-013
      expect(result.description).toBe('Un gran libro sobre arquitectura de software'); // HU-013: Spanish
      expect(result.language).toBe('en'); // HU-013
      expect(result.typeId).toBe(typeId);
      expect(result.format).toBe('pdf');
      expect(result.available).toBe(true);
      expect(result.path).toBe('/books/clean-arch.pdf');
    });

    it('should include levelId in persistence record (HU-008)', () => {
      const book = createDomainBook({ levelId: levelId });
      const params: BookToPersistenceParams = {
        book,
        embedding: [0.1, 0.2, 0.3],
        normalizedTitle: 'clean architecture',
      };

      const result = BookMapper.toPersistence(params);

      expect(result.levelId).toBe(levelId);
    });

    it('should handle null levelId (HU-008)', () => {
      const book = createDomainBook({ levelId: null });
      const params: BookToPersistenceParams = {
        book,
        embedding: [0.1, 0.2, 0.3],
        normalizedTitle: 'clean architecture',
      };

      const result = BookMapper.toPersistence(params);

      expect(result.levelId).toBeNull();
    });

    it('should handle different levelId values (HU-008)', () => {
      const book1 = createDomainBook({ levelId: levelId });
      const book2 = createDomainBook({ levelId: levelId2 });

      const result1 = BookMapper.toPersistence({
        book: book1,
        embedding: [0.1],
        normalizedTitle: 'test',
      });
      const result2 = BookMapper.toPersistence({
        book: book2,
        embedding: [0.1],
        normalizedTitle: 'test',
      });

      expect(result1.levelId).toBe(levelId);
      expect(result2.levelId).toBe(levelId2);
    });

    it('should include embedding from params', () => {
      const book = createDomainBook();
      const embedding = [0.1, 0.2, 0.3, 0.4, 0.5];
      const params: BookToPersistenceParams = {
        book,
        embedding,
        normalizedTitle: 'clean architecture',
      };

      const result = BookMapper.toPersistence(params);

      expect(result.embedding).toEqual(embedding);
    });

    it('should include normalizedTitle from params', () => {
      const book = createDomainBook();
      const params: BookToPersistenceParams = {
        book,
        embedding: [0.1],
        normalizedTitle: 'normalized title value',
      };

      const result = BookMapper.toPersistence(params);

      expect(result.normalizedTitle).toBe('normalized title value');
    });

    it('should extract typeId from book.type entity', () => {
      const book = createDomainBook();
      const params: BookToPersistenceParams = {
        book,
        embedding: [0.1],
        normalizedTitle: 'test',
      };

      const result = BookMapper.toPersistence(params);

      expect(result.typeId).toBe(mockType.id);
    });

    it('should handle null ISBN', () => {
      const book = Book.fromPersistence({
        id: bookId,
        isbn: null,
        title: 'Test Book',
        originalDescription: 'Test description', // HU-013
        description: 'Test description', // HU-013
        language: 'en', // HU-013
        authors: mockAuthors,
        type: mockType,
        categories: mockCategories,
        format: 'pdf',
        levelId: null,
        available: false,
        path: null,
        createdAt,
        updatedAt,
      });
      const params: BookToPersistenceParams = {
        book,
        embedding: [0.1],
        normalizedTitle: 'test book',
      };

      const result = BookMapper.toPersistence(params);

      expect(result.isbn).toBeNull();
    });

    it('should handle null path', () => {
      const book = Book.fromPersistence({
        id: bookId,
        isbn: '9781234567890',
        title: 'Test Book',
        originalDescription: 'Test description', // HU-013
        description: 'Test description', // HU-013
        language: 'en', // HU-013
        authors: mockAuthors,
        type: mockType,
        categories: mockCategories,
        format: 'epub',
        levelId: levelId,
        available: true,
        path: null,
        createdAt,
        updatedAt,
      });
      const params: BookToPersistenceParams = {
        book,
        embedding: [0.1],
        normalizedTitle: 'test book',
      };

      const result = BookMapper.toPersistence(params);

      expect(result.path).toBeNull();
    });

    it('should preserve timestamps', () => {
      const specificCreated = new Date('2025-11-11T11:11:11.000Z');
      const specificUpdated = new Date('2025-12-12T12:12:12.000Z');
      const book = Book.fromPersistence({
        id: bookId,
        isbn: '9781234567890',
        title: 'Test Book',
        originalDescription: 'Test description', // HU-013
        description: 'Test description', // HU-013
        language: 'en', // HU-013
        authors: mockAuthors,
        type: mockType,
        categories: mockCategories,
        format: 'pdf',
        levelId: levelId,
        available: true,
        path: '/test.pdf',
        createdAt: specificCreated,
        updatedAt: specificUpdated,
      });
      const params: BookToPersistenceParams = {
        book,
        embedding: [0.1],
        normalizedTitle: 'test book',
      };

      const result = BookMapper.toPersistence(params);

      expect(result.createdAt).toEqual(specificCreated);
      expect(result.updatedAt).toEqual(specificUpdated);
    });

    it('should handle available false', () => {
      const book = Book.fromPersistence({
        id: bookId,
        isbn: '9781234567890',
        title: 'Test Book',
        originalDescription: 'Test description', // HU-013
        description: 'Test description', // HU-013
        language: 'en', // HU-013
        authors: mockAuthors,
        type: mockType,
        categories: mockCategories,
        format: 'pdf',
        levelId: levelId,
        available: false,
        path: null,
        createdAt,
        updatedAt,
      });
      const params: BookToPersistenceParams = {
        book,
        embedding: [0.1],
        normalizedTitle: 'test book',
      };

      const result = BookMapper.toPersistence(params);

      expect(result.available).toBe(false);
    });
  });

  describe('toDomainList', () => {
    it('should convert empty array to empty array', () => {
      const result = BookMapper.toDomainList([]);

      expect(result).toEqual([]);
    });

    it('should convert single record with relations to array with one entity', () => {
      const record: BookWithRelations = {
        ...createMockDbRecord(),
        authors: mockAuthors,
        type: mockType,
        categories: mockCategories,
      };

      const result = BookMapper.toDomainList([record]);

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(Book);
      expect(result[0].id).toBe(bookId);
    });

    it('should convert multiple records to array of entities', () => {
      const bookId2 = '550e8400-e29b-41d4-a716-446655440099';
      const record1: BookWithRelations = {
        ...createMockDbRecord(),
        authors: mockAuthors,
        type: mockType,
        categories: mockCategories,
      };
      const record2: BookWithRelations = {
        ...createMockDbRecord({ id: bookId2, title: 'Second Book' }),
        authors: mockAuthors,
        type: mockType,
        categories: mockCategories,
      };

      const result = BookMapper.toDomainList([record1, record2]);

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Clean Architecture');
      expect(result[1].title).toBe('Second Book');
    });

    it('should preserve order of records', () => {
      const bookIdA = '550e8400-e29b-41d4-a716-446655440010';
      const bookIdB = '550e8400-e29b-41d4-a716-446655440011';
      const recordA: BookWithRelations = {
        ...createMockDbRecord({ id: bookIdA }),
        authors: mockAuthors,
        type: mockType,
        categories: mockCategories,
      };
      const recordB: BookWithRelations = {
        ...createMockDbRecord({ id: bookIdB }),
        authors: mockAuthors,
        type: mockType,
        categories: mockCategories,
      };

      const result = BookMapper.toDomainList([recordB, recordA]);

      expect(result[0].id).toBe(bookIdB);
      expect(result[1].id).toBe(bookIdA);
    });

    it('should preserve levelId in list conversion (HU-008)', () => {
      const record1: BookWithRelations = {
        ...createMockDbRecord({ levelId: levelId }),
        authors: mockAuthors,
        type: mockType,
        categories: mockCategories,
      };
      const record2: BookWithRelations = {
        ...createMockDbRecord({ id: '550e8400-e29b-41d4-a716-446655440099', levelId: null }),
        authors: mockAuthors,
        type: mockType,
        categories: mockCategories,
      };

      const result = BookMapper.toDomainList([record1, record2]);

      expect(result[0].levelId).toBe(levelId);
      expect(result[1].levelId).toBeNull();
    });
  });

  describe('round-trip conversion', () => {
    it('should preserve data through toDomain -> toPersistence cycle', () => {
      const originalRecord = createMockDbRecord();

      const entity = BookMapper.toDomain(originalRecord, mockAuthors, mockType, mockCategories);
      const result = BookMapper.toPersistence({
        book: entity,
        embedding: [0.1, 0.2],
        normalizedTitle: 'clean architecture',
      });

      expect(result.id).toBe(originalRecord.id);
      expect(result.isbn).toBe(originalRecord.isbn);
      expect(result.title).toBe(originalRecord.title);
      expect(result.originalDescription).toBe(originalRecord.originalDescription); // HU-013
      expect(result.description).toBe(originalRecord.description); // HU-013
      expect(result.language).toBe(originalRecord.language); // HU-013
      expect(result.typeId).toBe(originalRecord.typeId);
      expect(result.format).toBe(originalRecord.format);
      expect(result.levelId).toBe(originalRecord.levelId); // HU-008
      expect(result.available).toBe(originalRecord.available);
      expect(result.path).toBe(originalRecord.path);
      expect(result.createdAt).toEqual(originalRecord.createdAt);
      expect(result.updatedAt).toEqual(originalRecord.updatedAt);
    });

    it('should preserve levelId through round-trip conversion (HU-008)', () => {
      const originalRecord = createMockDbRecord({ levelId: levelId2 });

      const entity = BookMapper.toDomain(originalRecord, mockAuthors, mockType, mockCategories);
      const result = BookMapper.toPersistence({
        book: entity,
        embedding: [0.1],
        normalizedTitle: 'test',
      });

      expect(result.levelId).toBe(levelId2);
    });

    it('should preserve null levelId through round-trip conversion (HU-008)', () => {
      const originalRecord = createMockDbRecord({ levelId: null });

      const entity = BookMapper.toDomain(originalRecord, mockAuthors, mockType, mockCategories);
      const result = BookMapper.toPersistence({
        book: entity,
        embedding: [0.1],
        normalizedTitle: 'test',
      });

      expect(result.levelId).toBeNull();
    });

    it('should preserve null ISBN through round-trip', () => {
      const originalRecord = createMockDbRecord({ isbn: null });

      const entity = BookMapper.toDomain(originalRecord, mockAuthors, mockType, mockCategories);
      const result = BookMapper.toPersistence({
        book: entity,
        embedding: [0.1],
        normalizedTitle: 'test',
      });

      expect(result.isbn).toBeNull();
    });

    it('should preserve null path through round-trip', () => {
      const originalRecord = createMockDbRecord({ path: null });

      const entity = BookMapper.toDomain(originalRecord, mockAuthors, mockType, mockCategories);
      const result = BookMapper.toPersistence({
        book: entity,
        embedding: [0.1],
        normalizedTitle: 'test',
      });

      expect(result.path).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle empty embedding array', () => {
      const book = Book.fromPersistence({
        id: bookId,
        isbn: '9781234567890',
        title: 'Test Book',
        originalDescription: 'Test description', // HU-013
        description: 'Test description', // HU-013
        language: 'en', // HU-013
        authors: mockAuthors,
        type: mockType,
        categories: mockCategories,
        format: 'pdf',
        levelId: levelId,
        available: true,
        path: null,
        createdAt,
        updatedAt,
      });
      const params: BookToPersistenceParams = {
        book,
        embedding: [],
        normalizedTitle: 'test book',
      };

      const result = BookMapper.toPersistence(params);

      expect(result.embedding).toEqual([]);
    });

    it('should handle long embedding array (768 dimensions)', () => {
      const book = Book.fromPersistence({
        id: bookId,
        isbn: '9781234567890',
        title: 'Test Book',
        originalDescription: 'Test description', // HU-013
        description: 'Test description', // HU-013
        language: 'en', // HU-013
        authors: mockAuthors,
        type: mockType,
        categories: mockCategories,
        format: 'pdf',
        levelId: levelId,
        available: true,
        path: null,
        createdAt,
        updatedAt,
      });
      const embedding = Array.from({ length: 768 }, (_, i) => i * 0.001);
      const params: BookToPersistenceParams = {
        book,
        embedding,
        normalizedTitle: 'test book',
      };

      const result = BookMapper.toPersistence(params);

      expect(result.embedding).toHaveLength(768);
      expect(result.embedding).toEqual(embedding);
    });

    it('should handle multiple authors in toDomain', () => {
      const authors = [
        createMockAuthor(authorId, 'First Author'),
        createMockAuthor(authorId2, 'Second Author'),
      ];
      const record = createMockDbRecord();

      const result = BookMapper.toDomain(record, authors, mockType, mockCategories);

      expect(result.authors).toHaveLength(2);
      expect(result.authors[0].id).toBe(authorId);
      expect(result.authors[1].id).toBe(authorId2);
    });

    it('should handle multiple categories in toDomain', () => {
      const categories = [
        createMockCategory(categoryId, 'First Category', typeId),
        createMockCategory(categoryId2, 'Second Category', typeId),
      ];
      const record = createMockDbRecord();

      const result = BookMapper.toDomain(record, mockAuthors, mockType, categories);

      expect(result.categories).toHaveLength(2);
      expect(result.categories[0].id).toBe(categoryId);
      expect(result.categories[1].id).toBe(categoryId2);
    });

    it('should handle type with multiple levelIds', () => {
      const typeWithLevels = createMockBookType(typeId, 'technical', [levelId, levelId2]);
      const record = createMockDbRecord();

      const result = BookMapper.toDomain(record, mockAuthors, typeWithLevels, mockCategories);

      expect(result.type.levelIds).toContain(levelId);
      expect(result.type.levelIds).toContain(levelId2);
    });

    it('should handle type with no levelIds', () => {
      const typeWithoutLevels = createMockBookType(typeId, 'novel', []);
      const record = createMockDbRecord({ levelId: null });

      const result = BookMapper.toDomain(record, mockAuthors, typeWithoutLevels, mockCategories);

      expect(result.type.levelIds).toHaveLength(0);
      expect(result.levelId).toBeNull();
    });
  });
});
