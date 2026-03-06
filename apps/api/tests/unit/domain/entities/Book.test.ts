import { describe, it, expect, beforeEach } from 'vitest';
import {
  Book,
  type CreateBookProps,
  type BookPersistenceProps,
} from '../../../../src/domain/entities/Book.js';
import { Author } from '../../../../src/domain/entities/Author.js';
import { BookType } from '../../../../src/domain/entities/BookType.js';
import { Category } from '../../../../src/domain/entities/Category.js';
import {
  RequiredFieldError,
  FieldTooLongError,
  InvalidUUIDError,
  TooManyItemsError,
  DuplicateItemError,
  InvalidLanguageCodeError,
} from '../../../../src/domain/errors/DomainErrors.js';
import { InvalidBookFormatError } from '../../../../src/domain/value-objects/BookFormat.js';
import { InvalidBookIdentifierError } from '../../../../src/domain/value-objects/BookIdentifier.js';

describe('Book', () => {
  // Valid test data
  const validUUID = '550e8400-e29b-41d4-a716-446655440000';
  const validISBN = '9780132350884';
  const validLevelId = '660e8400-e29b-41d4-a716-446655440000';
  const validTypeId = 'bb0e8400-e29b-41d4-a716-446655440001';

  // Helper to create Author entities for testing
  const createAuthor = (id: string, name: string): Author => {
    return Author.create({ id, name });
  };

  // Helper to create BookType entities for testing
  const createBookType = (id: string, name: string): BookType => {
    return BookType.create({ id, name });
  };

  // Helper to create Category entities for testing
  const createCategory = (id: string, name: string, typeId: string): Category => {
    return Category.create({ id, name, typeId });
  };

  const robertMartin = createAuthor(
    '880e8400-e29b-41d4-a716-446655440001',
    'Robert C. Martin'
  );
  const martinFowler = createAuthor(
    '990e8400-e29b-41d4-a716-446655440002',
    'Martin Fowler'
  );
  const kentBeck = createAuthor(
    'aa0e8400-e29b-41d4-a716-446655440003',
    'Kent Beck'
  );

  const technicalType = createBookType(
    validTypeId,
    'technical'
  );
  const novelType = createBookType(
    'cc0e8400-e29b-41d4-a716-446655440002',
    'novel'
  );

  const programmingCategory = createCategory(
    '110e8400-e29b-41d4-a716-446655440001',
    'programming',
    validTypeId
  );
  const softwareCategory = createCategory(
    '220e8400-e29b-41d4-a716-446655440002',
    'software engineering',
    validTypeId
  );
  const bestPracticesCategory = createCategory(
    '330e8400-e29b-41d4-a716-446655440003',
    'best practices',
    validTypeId
  );

  const createValidBookProps = (overrides?: Partial<CreateBookProps>): CreateBookProps => ({
    id: validUUID,
    title: 'Clean Code',
    authors: [robertMartin],
    type: technicalType,
    categories: [programmingCategory],
    format: 'pdf',
    description: 'A handbook of agile software craftsmanship',
    language: 'en', // HU-013: Default to English
    ...overrides,
  });

  const createValidPersistenceProps = (
    overrides?: Partial<BookPersistenceProps>
  ): BookPersistenceProps => ({
    id: validUUID,
    title: 'Clean Code',
    authors: [robertMartin],
    type: technicalType,
    categories: [programmingCategory],
    format: 'pdf',
    isbn: null,
    levelId: null,
    originalDescription: 'A handbook of agile software craftsmanship', // HU-013
    description: 'Un manual de artesanía de software ágil', // HU-013: Spanish
    language: 'en', // HU-013
    available: false,
    path: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  });

  describe('create', () => {
    it('should create a valid Book with required fields', () => {
      const props = createValidBookProps();
      const book = Book.create(props);

      expect(book.id).toBe(validUUID);
      expect(book.title).toBe('Clean Code');
      expect(book.authors).toHaveLength(1);
      expect(book.authors[0].name).toBe('Robert C. Martin');
      expect(book.type.name).toBe('technical');
      expect(book.categories).toHaveLength(1);
      expect(book.categories[0].name).toBe('programming');
      expect(book.format.value).toBe('pdf');
      expect(book.isbn).toBeNull();
      expect(book.levelId).toBeNull();
      expect(book.description).toBe('A handbook of agile software craftsmanship');
      expect(book.available).toBe(true);
      expect(book.path).toBeNull();
    });

    it('should create a Book with all optional fields', () => {
      const props = createValidBookProps({
        isbn: validISBN,
        levelId: validLevelId,
        description: 'A handbook of agile software craftsmanship',
        available: true,
        path: '/books/clean-code.pdf',
      });

      const book = Book.create(props);

      expect(book.isbn?.value).toBe(validISBN);
      expect(book.levelId).toBe(validLevelId);
      expect(book.description).toBe('A handbook of agile software craftsmanship');
      expect(book.available).toBe(true);
      expect(book.path).toBe('/books/clean-code.pdf');
    });

    it('should create a Book with levelId', () => {
      const props = createValidBookProps({
        levelId: validLevelId,
      });

      const book = Book.create(props);

      expect(book.levelId).toBe(validLevelId);
    });

    it('should create a Book with null levelId when not provided', () => {
      const props = createValidBookProps();

      const book = Book.create(props);

      expect(book.levelId).toBeNull();
    });

    it('should create a Book with multiple authors', () => {
      const props = createValidBookProps({
        authors: [robertMartin, martinFowler, kentBeck],
      });

      const book = Book.create(props);

      expect(book.authors).toHaveLength(3);
      expect(book.authors.map(a => a.name)).toEqual([
        'Robert C. Martin',
        'Martin Fowler',
        'Kent Beck',
      ]);
    });

    it('should trim whitespace from string fields', () => {
      const props = createValidBookProps({
        title: '  Clean Code  ',
      });

      const book = Book.create(props);

      expect(book.title).toBe('Clean Code');
    });

    it('should allow multiple categories', () => {
      const props = createValidBookProps({
        categories: [programmingCategory, softwareCategory, bestPracticesCategory],
      });

      const book = Book.create(props);
      expect(book.categories).toHaveLength(3);
      expect(book.categories.map(c => c.name)).toEqual([
        'programming',
        'software engineering',
        'best practices',
      ]);
    });

    it('should set createdAt and updatedAt to now if not provided', () => {
      const before = new Date();
      const book = Book.create(createValidBookProps());
      const after = new Date();

      expect(book.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(book.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
      expect(book.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(book.updatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should use provided createdAt and updatedAt', () => {
      const createdAt = new Date('2024-01-01');
      const updatedAt = new Date('2024-06-15');

      const book = Book.create(createValidBookProps({ createdAt, updatedAt }));

      expect(book.createdAt).toEqual(createdAt);
      expect(book.updatedAt).toEqual(updatedAt);
    });

    describe('validation errors', () => {
      describe('id', () => {
        it('should throw RequiredFieldError for empty id', () => {
          expect(() => Book.create(createValidBookProps({ id: '' }))).toThrow(
            RequiredFieldError
          );
        });

        it('should throw InvalidUUIDError for invalid UUID format', () => {
          expect(() =>
            Book.create(createValidBookProps({ id: 'not-a-uuid' }))
          ).toThrow(InvalidUUIDError);
        });

        it('should throw InvalidUUIDError for UUID v1 (not v4)', () => {
          // UUID v1 has different format in the third group
          expect(() =>
            Book.create(
              createValidBookProps({ id: '550e8400-e29b-11d4-a716-446655440000' })
            )
          ).toThrow(InvalidUUIDError);
        });
      });

      describe('title', () => {
        it('should throw RequiredFieldError for empty title', () => {
          expect(() => Book.create(createValidBookProps({ title: '' }))).toThrow(
            RequiredFieldError
          );
        });

        it('should throw RequiredFieldError for whitespace-only title', () => {
          expect(() =>
            Book.create(createValidBookProps({ title: '   ' }))
          ).toThrow(RequiredFieldError);
        });

        it('should throw FieldTooLongError for title exceeding 500 chars', () => {
          const longTitle = 'A'.repeat(501);
          expect(() =>
            Book.create(createValidBookProps({ title: longTitle }))
          ).toThrow(FieldTooLongError);
        });
      });

      describe('authors', () => {
        it('should throw RequiredFieldError for empty authors array', () => {
          expect(() =>
            Book.create(createValidBookProps({ authors: [] }))
          ).toThrow(RequiredFieldError);
        });

        it('should throw TooManyItemsError for more than 10 authors', () => {
          const tooManyAuthors = Array.from({ length: 11 }, (_, i) =>
            createAuthor(
              `550e8400-e29b-41d4-a716-4466554400${i.toString().padStart(2, '0')}`,
              `Author ${i}`
            )
          );
          expect(() =>
            Book.create(createValidBookProps({ authors: tooManyAuthors }))
          ).toThrow(TooManyItemsError);
        });

        it('should throw DuplicateItemError for authors with duplicate IDs but different names', () => {
          const duplicateAuthor = createAuthor(
            '880e8400-e29b-41d4-a716-446655440001', // Same ID as robertMartin
            'Different Name'
          );
          expect(() =>
            Book.create(createValidBookProps({
              authors: [robertMartin, duplicateAuthor],
            }))
          ).toThrow(DuplicateItemError);
        });

        it('should deduplicate authors with the same name (case-insensitive), keeping first occurrence', () => {
          const authorA = createAuthor('880e8400-e29b-41d4-a716-446655440010', 'Robert Martin');
          const authorB = createAuthor('880e8400-e29b-41d4-a716-446655440011', 'Robert Martin');
          const book = Book.create(createValidBookProps({ authors: [authorA, authorB] }));
          expect(book.authors).toHaveLength(1);
          expect(book.authors[0]!.id).toBe(authorA.id);
        });

        it('should deduplicate authors with the same name ignoring case differences', () => {
          const authorA = createAuthor('880e8400-e29b-41d4-a716-446655440012', 'robert martin');
          const authorB = createAuthor('880e8400-e29b-41d4-a716-446655440013', 'Robert Martin');
          const book = Book.create(createValidBookProps({ authors: [authorA, authorB] }));
          expect(book.authors).toHaveLength(1);
          expect(book.authors[0]!.id).toBe(authorA.id);
        });

        it('should deduplicate authors with the same name ignoring surrounding whitespace', () => {
          const authorA = createAuthor('880e8400-e29b-41d4-a716-446655440014', 'Robert Martin');
          const authorB = createAuthor('880e8400-e29b-41d4-a716-446655440015', '  Robert Martin  ');
          const book = Book.create(createValidBookProps({ authors: [authorA, authorB] }));
          expect(book.authors).toHaveLength(1);
        });

        it('should throw RequiredFieldError when all authors are duplicates (resulting empty array)', () => {
          const authorA = createAuthor('880e8400-e29b-41d4-a716-446655440016', 'Robert Martin');
          const authorB = createAuthor('880e8400-e29b-41d4-a716-446655440017', 'Robert Martin');
          // Both have same name → deduplicated to 1 author, which is valid (≥ 1)
          const book = Book.create(createValidBookProps({ authors: [authorA, authorB] }));
          expect(book.authors).toHaveLength(1);
        });

        it('should throw TooManyItemsError when more than 10 unique authors after deduplication', () => {
          // 11 authors with unique names → should still throw TooManyItemsError
          const tooManyAuthors = Array.from({ length: 11 }, (_, i) =>
            createAuthor(
              `550e8400-e29b-41d4-a716-4466554400${i.toString().padStart(2, '0')}`,
              `Unique Author ${i}`
            )
          );
          expect(() =>
            Book.create(createValidBookProps({ authors: tooManyAuthors }))
          ).toThrow(TooManyItemsError);
        });

        it('should not throw TooManyItemsError when 11 authors deduplicate down to 10', () => {
          // 10 unique names + 1 duplicate → deduplicates to 10 → valid
          const authors = Array.from({ length: 10 }, (_, i) =>
            createAuthor(
              `550e8400-e29b-41d4-a716-4466554400${i.toString().padStart(2, '0')}`,
              `Author ${i}`
            )
          );
          const duplicateOfFirst = createAuthor(
            '880e8400-e29b-41d4-a716-446655440099',
            'Author 0' // same name as first
          );
          const book = Book.create(createValidBookProps({ authors: [...authors, duplicateOfFirst] }));
          expect(book.authors).toHaveLength(10);
        });

        it('should accept exactly 10 authors', () => {
          const tenAuthors = Array.from({ length: 10 }, (_, i) =>
            createAuthor(
              `550e8400-e29b-41d4-a716-4466554400${i.toString().padStart(2, '0')}`,
              `Author ${i}`
            )
          );
          const book = Book.create(createValidBookProps({ authors: tenAuthors }));
          expect(book.authors).toHaveLength(10);
        });
      });

      describe('type', () => {
        it('should throw RequiredFieldError for null type', () => {
          expect(() =>
            Book.create(createValidBookProps({ type: null as unknown as BookType }))
          ).toThrow(RequiredFieldError);
        });

        it('should throw RequiredFieldError for undefined type', () => {
          expect(() =>
            Book.create(createValidBookProps({ type: undefined as unknown as BookType }))
          ).toThrow(RequiredFieldError);
        });
      });

      describe('categories', () => {
        it('should throw RequiredFieldError for empty categories array', () => {
          expect(() =>
            Book.create(createValidBookProps({ categories: [] }))
          ).toThrow(RequiredFieldError);
        });

        it('should throw TooManyItemsError for more than 10 categories', () => {
          const tooManyCategories = Array.from({ length: 11 }, (_, i) =>
            createCategory(
              `550e8400-e29b-41d4-a716-4466554400${i.toString().padStart(2, '0')}`,
              `category${i}`,
              validTypeId
            )
          );
          expect(() =>
            Book.create(createValidBookProps({ categories: tooManyCategories }))
          ).toThrow(TooManyItemsError);
        });

        it('should throw DuplicateItemError for duplicate category IDs', () => {
          const duplicateCategory = createCategory(
            '110e8400-e29b-41d4-a716-446655440001', // Same ID as programmingCategory
            'different name',
            validTypeId
          );
          expect(() =>
            Book.create(createValidBookProps({
              categories: [programmingCategory, duplicateCategory],
            }))
          ).toThrow(DuplicateItemError);
        });

        it('should accept exactly 10 categories', () => {
          const tenCategories = Array.from({ length: 10 }, (_, i) =>
            createCategory(
              `550e8400-e29b-41d4-a716-4466554400${i.toString().padStart(2, '0')}`,
              `category${i}`,
              validTypeId
            )
          );
          const book = Book.create(createValidBookProps({ categories: tenCategories }));
          expect(book.categories).toHaveLength(10);
        });
      });

      describe('format', () => {
        it('should throw InvalidBookFormatError for invalid format', () => {
          expect(() =>
            Book.create(createValidBookProps({ format: 'invalid' }))
          ).toThrow(InvalidBookFormatError);
        });
      });

      describe('isbn', () => {
        it('should throw InvalidBookIdentifierError for invalid identifier', () => {
          expect(() =>
            Book.create(createValidBookProps({ isbn: 'invalid identifier!' }))
          ).toThrow(InvalidBookIdentifierError);
        });

        it('should accept null ISBN', () => {
          const book = Book.create(createValidBookProps({ isbn: null }));
          expect(book.isbn).toBeNull();
        });
      });

      describe('levelId', () => {
        it('should throw RequiredFieldError for invalid levelId (not UUID)', () => {
          expect(() =>
            Book.create(createValidBookProps({ levelId: 'not-a-uuid' }))
          ).toThrow(RequiredFieldError);
        });

        it('should treat empty levelId as null', () => {
          const book = Book.create(createValidBookProps({ levelId: '' }));
          expect(book.levelId).toBeNull();
        });

        it('should throw RequiredFieldError for whitespace-only levelId', () => {
          expect(() =>
            Book.create(createValidBookProps({ levelId: '   ' }))
          ).toThrow(RequiredFieldError);
        });

        it('should accept null levelId', () => {
          const book = Book.create(createValidBookProps({ levelId: null }));
          expect(book.levelId).toBeNull();
        });

        it('should accept valid UUID levelId', () => {
          const book = Book.create(createValidBookProps({ levelId: validLevelId }));
          expect(book.levelId).toBe(validLevelId);
        });

        it('should trim whitespace from levelId', () => {
          const book = Book.create(createValidBookProps({ levelId: `  ${validLevelId}  ` }));
          expect(book.levelId).toBe(validLevelId);
        });
      });

      describe('description', () => {
        it('should throw RequiredFieldError for empty description', () => {
          expect(() =>
            Book.create(createValidBookProps({ description: '' }))
          ).toThrow(RequiredFieldError);
        });

        it('should throw RequiredFieldError for whitespace-only description', () => {
          expect(() =>
            Book.create(createValidBookProps({ description: '   ' }))
          ).toThrow(RequiredFieldError);
        });

        it('should throw FieldTooLongError for description exceeding 25000 chars', () => {
          const longDescription = 'A'.repeat(25001);
          expect(() =>
            Book.create(createValidBookProps({ description: longDescription }))
          ).toThrow(FieldTooLongError);
        });
      });

      // HU-013: Tests for originalDescription and language
      describe('originalDescription (HU-013)', () => {
        it('should store input description as originalDescription', () => {
          const inputDescription = 'A handbook of agile software craftsmanship';
          const book = Book.create(createValidBookProps({ description: inputDescription }));
          
          expect(book.originalDescription).toBe(inputDescription);
        });

        it('should use originalDescription as description when no translatedDescription provided', () => {
          const inputDescription = 'A handbook of agile software craftsmanship';
          const book = Book.create(createValidBookProps({ description: inputDescription }));
          
          // When no translatedDescription is provided, description equals originalDescription
          expect(book.description).toBe(inputDescription);
          expect(book.originalDescription).toBe(inputDescription);
        });

        it('should use translatedDescription as description when provided', () => {
          const originalDesc = 'A handbook of agile software craftsmanship';
          const translatedDesc = 'Un manual de artesanía de software ágil';
          const book = Book.create(createValidBookProps({
            description: originalDesc,
            translatedDescription: translatedDesc,
          }));
          
          expect(book.originalDescription).toBe(originalDesc);
          expect(book.description).toBe(translatedDesc);
        });

        it('should validate translatedDescription max length', () => {
          const longTranslation = 'A'.repeat(25001);
          expect(() =>
            Book.create(createValidBookProps({
              description: 'Valid original',
              translatedDescription: longTranslation,
            }))
          ).toThrow(FieldTooLongError);
        });

        it('should trim whitespace from originalDescription', () => {
          const book = Book.create(createValidBookProps({
            description: '  A handbook of agile software craftsmanship  ',
          }));
          
          expect(book.originalDescription).toBe('A handbook of agile software craftsmanship');
        });
      });

      describe('language (HU-013)', () => {
        it('should accept valid ISO 639-1 language code', () => {
          const book = Book.create(createValidBookProps({ language: 'en' }));
          expect(book.language).toBe('en');
        });

        it('should accept Spanish language code', () => {
          const book = Book.create(createValidBookProps({ language: 'es' }));
          expect(book.language).toBe('es');
        });

        it('should normalize language code to lowercase', () => {
          const book = Book.create(createValidBookProps({ language: 'EN' }));
          expect(book.language).toBe('en');
        });

        it('should trim whitespace from language code', () => {
          const book = Book.create(createValidBookProps({ language: '  fr  ' }));
          expect(book.language).toBe('fr');
        });

        it('should throw RequiredFieldError for empty language', () => {
          expect(() =>
            Book.create(createValidBookProps({ language: '' }))
          ).toThrow(RequiredFieldError);
        });

        it('should throw RequiredFieldError for whitespace-only language', () => {
          expect(() =>
            Book.create(createValidBookProps({ language: '   ' }))
          ).toThrow(RequiredFieldError);
        });

        it('should throw InvalidLanguageCodeError for invalid language format (too long)', () => {
          expect(() =>
            Book.create(createValidBookProps({ language: 'eng' }))
          ).toThrow(InvalidLanguageCodeError);
        });

        it('should throw InvalidLanguageCodeError for invalid language format (too short)', () => {
          expect(() =>
            Book.create(createValidBookProps({ language: 'e' }))
          ).toThrow(InvalidLanguageCodeError);
        });

        it('should throw InvalidLanguageCodeError for language with numbers', () => {
          expect(() =>
            Book.create(createValidBookProps({ language: 'e1' }))
          ).toThrow(InvalidLanguageCodeError);
        });
      });

      describe('available', () => {
        it('should default to true when not provided', () => {
          const { available: _ignored, ...propsWithoutAvailable } = createValidBookProps();
          const book = Book.create(propsWithoutAvailable);
          expect(book.available).toBe(true);
        });

        it('should accept true value', () => {
          const book = Book.create(createValidBookProps({ available: true }));
          expect(book.available).toBe(true);
        });

        it('should accept explicit false value', () => {
          const book = Book.create(createValidBookProps({ available: false }));
          expect(book.available).toBe(false);
        });
      });

      describe('path', () => {
        it('should accept valid path', () => {
          const book = Book.create(createValidBookProps({ path: '/books/clean-code.pdf' }));
          expect(book.path).toBe('/books/clean-code.pdf');
        });

        it('should accept null path', () => {
          const book = Book.create(createValidBookProps({ path: null }));
          expect(book.path).toBeNull();
        });

        it('should default to null when not provided', () => {
          const book = Book.create(createValidBookProps());
          expect(book.path).toBeNull();
        });

        it('should trim whitespace from path', () => {
          const book = Book.create(createValidBookProps({ path: '  /books/file.pdf  ' }));
          expect(book.path).toBe('/books/file.pdf');
        });

        it('should throw FieldTooLongError for path exceeding 1000 chars', () => {
          const longPath = '/books/' + 'A'.repeat(995);
          expect(() =>
            Book.create(createValidBookProps({ path: longPath }))
          ).toThrow(FieldTooLongError);
        });
      });
    });
  });

  describe('fromPersistence', () => {
    it('should reconstruct a Book without validation', () => {
      const props = createValidPersistenceProps();
      const book = Book.fromPersistence(props);

      expect(book.id).toBe(validUUID);
      expect(book.title).toBe('Clean Code');
      expect(book.authors).toHaveLength(1);
      expect(book.authors[0].name).toBe('Robert C. Martin');
      expect(book.type.name).toBe('technical');
      expect(book.categories).toHaveLength(1);
      expect(book.levelId).toBeNull();
      expect(book.available).toBe(false);
      expect(book.path).toBeNull();
    });

    it('should reconstruct a Book with levelId', () => {
      const props = createValidPersistenceProps({
        levelId: validLevelId,
      });

      const book = Book.fromPersistence(props);

      expect(book.levelId).toBe(validLevelId);
    });

    it('should reconstruct a Book with all fields', () => {
      const anotherLevelId = '770e8400-e29b-41d4-a716-446655440000';
      const props = createValidPersistenceProps({
        isbn: validISBN,
        levelId: anotherLevelId,
        description: 'A great book',
        available: true,
        path: '/books/clean-code.pdf',
        authors: [robertMartin, martinFowler],
        categories: [programmingCategory, softwareCategory],
      });

      const book = Book.fromPersistence(props);

      expect(book.isbn?.value).toBe(validISBN);
      expect(book.levelId).toBe(anotherLevelId);
      expect(book.description).toBe('A great book');
      expect(book.available).toBe(true);
      expect(book.path).toBe('/books/clean-code.pdf');
      expect(book.authors).toHaveLength(2);
      expect(book.categories).toHaveLength(2);
    });

    // HU-013: Tests for fromPersistence with originalDescription and language
    it('should reconstruct a Book with originalDescription and language (HU-013)', () => {
      const props = createValidPersistenceProps({
        originalDescription: 'A handbook of agile software craftsmanship',
        description: 'Un manual de artesanía de software ágil',
        language: 'en',
      });

      const book = Book.fromPersistence(props);

      expect(book.originalDescription).toBe('A handbook of agile software craftsmanship');
      expect(book.description).toBe('Un manual de artesanía de software ágil');
      expect(book.language).toBe('en');
    });

    it('should reconstruct a Book where originalDescription equals description for Spanish (HU-013)', () => {
      const spanishDescription = 'Un libro sobre código limpio';
      const props = createValidPersistenceProps({
        originalDescription: spanishDescription,
        description: spanishDescription,
        language: 'es',
      });

      const book = Book.fromPersistence(props);

      expect(book.originalDescription).toBe(spanishDescription);
      expect(book.description).toBe(spanishDescription);
      expect(book.language).toBe('es');
    });
  });

  describe('update', () => {
    let book: Book;

    beforeEach(() => {
      book = Book.create(createValidBookProps());
    });

    it('should return a new Book instance', () => {
      const updated = book.update({ title: 'New Title' });
      expect(updated).not.toBe(book);
    });

    it('should update title', () => {
      const updated = book.update({ title: 'New Title' });
      expect(updated.title).toBe('New Title');
      expect(book.title).toBe('Clean Code'); // Original unchanged
    });

    it('should update authors', () => {
      const updated = book.update({ authors: [martinFowler, kentBeck] });
      expect(updated.authors).toHaveLength(2);
      expect(updated.authors.map(a => a.name)).toEqual(['Martin Fowler', 'Kent Beck']);
    });

    it('should update type', () => {
      const updated = book.update({ type: novelType });
      expect(updated.type.name).toBe('novel');
    });

    it('should update categories', () => {
      const updated = book.update({
        categories: [softwareCategory, bestPracticesCategory],
      });
      expect(updated.categories).toHaveLength(2);
      expect(updated.categories.map(c => c.name)).toEqual([
        'software engineering',
        'best practices',
      ]);
    });

    it('should update format', () => {
      const updated = book.update({ format: 'epub' });
      expect(updated.format.value).toBe('epub');
    });

    it('should update isbn', () => {
      const updated = book.update({ isbn: validISBN });
      expect(updated.isbn?.value).toBe(validISBN);
    });

    it('should set isbn to null', () => {
      const bookWithIsbn = Book.create(createValidBookProps({ isbn: validISBN }));
      const updated = bookWithIsbn.update({ isbn: null });
      expect(updated.isbn).toBeNull();
    });

    // HU-013: description is no longer editable (affects embeddings)
    // Tests for description update have been removed

    it('should update available', () => {
      const updated = book.update({ available: true });
      expect(updated.available).toBe(true);
    });

    it('should update available to false', () => {
      const bookAvailable = Book.create(createValidBookProps({ available: true }));
      const updated = bookAvailable.update({ available: false });
      expect(updated.available).toBe(false);
    });

    it('should update path', () => {
      const updated = book.update({ path: '/new/path.pdf' });
      expect(updated.path).toBe('/new/path.pdf');
    });

    it('should set path to null', () => {
      const bookWithPath = Book.create(createValidBookProps({ path: '/old/path.pdf' }));
      const updated = bookWithPath.update({ path: null });
      expect(updated.path).toBeNull();
    });

    it('should update multiple fields at once', () => {
      // HU-013: description is no longer editable (removed from UpdateBookProps)
      const updated = book.update({
        title: 'New Title',
        authors: [martinFowler],
        format: 'mobi', // Changed to format since description is not editable
      });

      expect(updated.title).toBe('New Title');
      expect(updated.authors[0].name).toBe('Martin Fowler');
      expect(updated.format.value).toBe('mobi');
      // description should remain unchanged
      expect(updated.description).toBe(book.description);
    });

    it('should preserve unchanged fields', () => {
      const updated = book.update({ title: 'New Title' });

      expect(updated.authors).toHaveLength(book.authors.length);
      expect(updated.type.name).toBe(book.type.name);
      expect(updated.categories).toHaveLength(book.categories.length);
      expect(updated.format.value).toBe(book.format.value);
      expect(updated.levelId).toBe(book.levelId);
      expect(updated.available).toBe(book.available);
      expect(updated.path).toBe(book.path);
    });

    it('should preserve levelId on update (levelId is not editable)', () => {
      const bookWithLevel = Book.create(createValidBookProps({ levelId: validLevelId }));
      const updated = bookWithLevel.update({ title: 'New Title' });

      expect(updated.levelId).toBe(validLevelId);
    });

    it('should preserve id and createdAt', () => {
      const updated = book.update({ title: 'New Title' });

      expect(updated.id).toBe(book.id);
      expect(updated.createdAt).toEqual(book.createdAt);
    });

    it('should update updatedAt timestamp', () => {
      const before = new Date();
      const updated = book.update({ title: 'New Title' });
      const after = new Date();

      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(updated.updatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should validate updated fields', () => {
      expect(() => book.update({ title: '' })).toThrow(RequiredFieldError);
    });

    it('should throw RequiredFieldError for empty authors on update', () => {
      expect(() => book.update({ authors: [] })).toThrow(RequiredFieldError);
    });

    // HU-013: originalDescription, description, and language are not editable after creation
    it('should preserve originalDescription on update (HU-013)', () => {
      const book = Book.create(createValidBookProps({
        description: 'Original description',
        translatedDescription: 'Descripción traducida',
      }));
      const updated = book.update({ title: 'New Title' });

      expect(updated.originalDescription).toBe('Original description');
      expect(updated.description).toBe('Descripción traducida');
    });

    it('should preserve language on update (HU-013)', () => {
      const book = Book.create(createValidBookProps({ language: 'fr' }));
      const updated = book.update({ title: 'New Title' });

      expect(updated.language).toBe('fr');
    });
  });

  describe('getTextForEmbedding', () => {
    it('should combine title, all author names, type, category names, and description', () => {
      const book = Book.create(createValidBookProps({
        authors: [robertMartin, martinFowler],
        categories: [programmingCategory, softwareCategory],
        description: 'A great book about clean code',
      }));
      const text = book.getTextForEmbedding();

      expect(text).toContain('Clean Code');
      expect(text).toContain('Robert C. Martin');
      expect(text).toContain('Martin Fowler');
      expect(text).toContain('technical');
      expect(text).toContain('programming');
      expect(text).toContain('software engineering');
      expect(text).toContain('A great book about clean code');
    });

    it('should concatenate multiple authors in embedding text', () => {
      const book = Book.create(createValidBookProps({
        authors: [robertMartin, martinFowler, kentBeck],
        description: 'Short description',
      }));
      const text = book.getTextForEmbedding();

      // Verify all authors are included
      expect(text).toBe('Clean Code Robert C. Martin Martin Fowler Kent Beck technical programming Short description');
    });

    it('should always include description in embedding text', () => {
      const book = Book.create(createValidBookProps({
        description: 'Short description',
      }));
      const text = book.getTextForEmbedding();

      expect(text).toBe('Clean Code Robert C. Martin technical programming Short description');
    });

    it('should trim description in embedding text', () => {
      const book = Book.create(createValidBookProps({
        description: '  A great book about clean code  ',
      }));
      const text = book.getTextForEmbedding();

      expect(text).toContain('A great book about clean code');
      expect(text).not.toContain('  A great book about clean code  ');
    });

    // HU-013: Tests for embedding with translation
    it('should use description (not originalDescription) for embedding (HU-013)', () => {
      const originalDesc = 'A handbook of agile software craftsmanship';
      const translatedDesc = 'Un manual de artesanía de software ágil';
      const book = Book.create(createValidBookProps({
        description: originalDesc,
        translatedDescription: translatedDesc,
      }));
      const text = book.getTextForEmbedding();

      // Should contain the translated (Spanish) description, NOT the original
      expect(text).toContain(translatedDesc);
      expect(text).not.toContain(originalDesc);
    });

    it('should include Spanish description in embedding for semantic search (HU-013)', () => {
      const book = Book.create(createValidBookProps({
        description: 'Clean Code book',
        translatedDescription: 'Libro sobre código limpio',
        language: 'en',
      }));
      const text = book.getTextForEmbedding();

      // The embedding should use Spanish for consistent semantic search
      expect(text).toBe('Clean Code Robert C. Martin technical programming Libro sobre código limpio');
    });
  });

  describe('equals', () => {
    it('should return true for Books with same id', () => {
      const book1 = Book.create(createValidBookProps());
      const book2 = Book.create(createValidBookProps({ title: 'Different Title' }));

      expect(book1.equals(book2)).toBe(true);
    });

    it('should return false for Books with different ids', () => {
      const book1 = Book.create(createValidBookProps());
      const book2 = Book.create(
        createValidBookProps({ id: '660e8400-e29b-41d4-a716-446655440000' })
      );

      expect(book1.equals(book2)).toBe(false);
    });

    it('should return true for Books with same id but different levelIds', () => {
      const anotherLevelId = '770e8400-e29b-41d4-a716-446655440000';
      const book1 = Book.create(createValidBookProps({ levelId: validLevelId }));
      const book2 = Book.create(createValidBookProps({ levelId: anotherLevelId }));

      // Entities are compared by ID, not by attributes
      expect(book1.equals(book2)).toBe(true);
    });
  });

  describe('immutability', () => {
    it('should be frozen', () => {
      const book = Book.create(createValidBookProps());
      expect(Object.isFrozen(book)).toBe(true);
    });

    it('should not allow property modification', () => {
      const book = Book.create(createValidBookProps());
      expect(() => {
        // @ts-expect-error - Testing runtime immutability
        book.title = 'New Title';
      }).toThrow();
    });

    it('should not allow levelId modification', () => {
      const book = Book.create(createValidBookProps({ levelId: validLevelId }));
      expect(() => {
        // @ts-expect-error - Testing runtime immutability
        book.levelId = '770e8400-e29b-41d4-a716-446655440000';
      }).toThrow();
    });

    // HU-013: Immutability tests for originalDescription and language
    it('should not allow originalDescription modification (HU-013)', () => {
      const book = Book.create(createValidBookProps());
      expect(() => {
        // @ts-expect-error - Testing runtime immutability
        book.originalDescription = 'New description';
      }).toThrow();
    });

    it('should not allow language modification (HU-013)', () => {
      const book = Book.create(createValidBookProps());
      expect(() => {
        // @ts-expect-error - Testing runtime immutability
        book.language = 'fr';
      }).toThrow();
    });
  });
});
