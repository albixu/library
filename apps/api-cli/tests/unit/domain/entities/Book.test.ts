import { describe, it, expect, beforeEach } from 'vitest';
import {
  Book,
  type CreateBookProps,
  type BookPersistenceProps,
} from '../../../../src/domain/entities/Book.js';
import {
  RequiredFieldError,
  FieldTooLongError,
  InvalidUUIDError,
  InvalidEmbeddingError,
} from '../../../../src/domain/errors/DomainErrors.js';
import { InvalidBookTypeError } from '../../../../src/domain/value-objects/BookType.js';
import { InvalidBookFormatError } from '../../../../src/domain/value-objects/BookFormat.js';
import { InvalidISBNError } from '../../../../src/domain/value-objects/ISBN.js';

describe('Book', () => {
  // Valid test data
  const validUUID = '550e8400-e29b-41d4-a716-446655440000';
  const validISBN = '9780132350884';

  const createValidBookProps = (overrides?: Partial<CreateBookProps>): CreateBookProps => ({
    id: validUUID,
    title: 'Clean Code',
    author: 'Robert C. Martin',
    type: 'technical',
    category: 'programming',
    format: 'pdf',
    ...overrides,
  });

  const createValidPersistenceProps = (
    overrides?: Partial<BookPersistenceProps>
  ): BookPersistenceProps => ({
    id: validUUID,
    title: 'Clean Code',
    author: 'Robert C. Martin',
    type: 'technical',
    category: 'programming',
    format: 'pdf',
    isbn: null,
    description: null,
    embedding: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  });

  const createValidEmbedding = (): number[] => {
    return Array.from({ length: 768 }, (_, i) => Math.random() * 2 - 1);
  };

  describe('create', () => {
    it('should create a valid Book with required fields', () => {
      const props = createValidBookProps();
      const book = Book.create(props);

      expect(book.id).toBe(validUUID);
      expect(book.title).toBe('Clean Code');
      expect(book.author).toBe('Robert C. Martin');
      expect(book.type.value).toBe('technical');
      expect(book.category).toBe('programming');
      expect(book.format.value).toBe('pdf');
      expect(book.isbn).toBeNull();
      expect(book.description).toBeNull();
      expect(book.embedding).toBeNull();
    });

    it('should create a Book with all optional fields', () => {
      const embedding = createValidEmbedding();
      const props = createValidBookProps({
        isbn: validISBN,
        description: 'A handbook of agile software craftsmanship',
        embedding,
      });

      const book = Book.create(props);

      expect(book.isbn?.value).toBe(validISBN);
      expect(book.description).toBe('A handbook of agile software craftsmanship');
      expect(book.embedding).toHaveLength(768);
    });

    it('should trim whitespace from string fields', () => {
      const props = createValidBookProps({
        title: '  Clean Code  ',
        author: '  Robert C. Martin  ',
        category: '  programming  ',
      });

      const book = Book.create(props);

      expect(book.title).toBe('Clean Code');
      expect(book.author).toBe('Robert C. Martin');
      expect(book.category).toBe('programming');
    });

    it('should normalize category to lowercase', () => {
      const props = createValidBookProps({
        category: 'PROGRAMMING',
      });

      const book = Book.create(props);
      expect(book.category).toBe('programming');
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

      describe('author', () => {
        it('should throw RequiredFieldError for empty author', () => {
          expect(() => Book.create(createValidBookProps({ author: '' }))).toThrow(
            RequiredFieldError
          );
        });

        it('should throw FieldTooLongError for author exceeding 300 chars', () => {
          const longAuthor = 'A'.repeat(301);
          expect(() =>
            Book.create(createValidBookProps({ author: longAuthor }))
          ).toThrow(FieldTooLongError);
        });
      });

      describe('category', () => {
        it('should throw RequiredFieldError for empty category', () => {
          expect(() =>
            Book.create(createValidBookProps({ category: '' }))
          ).toThrow(RequiredFieldError);
        });

        it('should throw FieldTooLongError for category exceeding 100 chars', () => {
          const longCategory = 'A'.repeat(101);
          expect(() =>
            Book.create(createValidBookProps({ category: longCategory }))
          ).toThrow(FieldTooLongError);
        });
      });

      describe('type', () => {
        it('should throw InvalidBookTypeError for invalid type', () => {
          expect(() =>
            Book.create(createValidBookProps({ type: 'invalid' }))
          ).toThrow(InvalidBookTypeError);
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
        it('should throw InvalidISBNError for invalid ISBN', () => {
          expect(() =>
            Book.create(createValidBookProps({ isbn: 'invalid' }))
          ).toThrow(InvalidISBNError);
        });

        it('should accept null ISBN', () => {
          const book = Book.create(createValidBookProps({ isbn: null }));
          expect(book.isbn).toBeNull();
        });
      });

      describe('description', () => {
        it('should throw FieldTooLongError for description exceeding 5000 chars', () => {
          const longDescription = 'A'.repeat(5001);
          expect(() =>
            Book.create(createValidBookProps({ description: longDescription }))
          ).toThrow(FieldTooLongError);
        });

        it('should accept null description', () => {
          const book = Book.create(createValidBookProps({ description: null }));
          expect(book.description).toBeNull();
        });
      });

      describe('embedding', () => {
        it('should throw InvalidEmbeddingError for wrong dimensions', () => {
          expect(() =>
            Book.create(createValidBookProps({ embedding: [1, 2, 3] }))
          ).toThrow(InvalidEmbeddingError);
        });

        it('should throw InvalidEmbeddingError for non-number values', () => {
          const invalidEmbedding = Array.from({ length: 768 }, () => 'not a number') as unknown as number[];
          expect(() =>
            Book.create(createValidBookProps({ embedding: invalidEmbedding }))
          ).toThrow(InvalidEmbeddingError);
        });

        it('should throw InvalidEmbeddingError for NaN values', () => {
          const embeddingWithNaN = createValidEmbedding();
          embeddingWithNaN[0] = NaN;
          expect(() =>
            Book.create(createValidBookProps({ embedding: embeddingWithNaN }))
          ).toThrow(InvalidEmbeddingError);
        });

        it('should accept null embedding', () => {
          const book = Book.create(createValidBookProps({ embedding: null }));
          expect(book.embedding).toBeNull();
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
      expect(book.type.value).toBe('technical');
    });

    it('should reconstruct a Book with all fields', () => {
      const embedding = createValidEmbedding();
      const props = createValidPersistenceProps({
        isbn: validISBN,
        description: 'A great book',
        embedding,
      });

      const book = Book.fromPersistence(props);

      expect(book.isbn?.value).toBe(validISBN);
      expect(book.description).toBe('A great book');
      expect(book.embedding).toHaveLength(768);
    });

    it('should freeze the embedding array', () => {
      const embedding = createValidEmbedding();
      const book = Book.fromPersistence(
        createValidPersistenceProps({ embedding })
      );

      expect(Object.isFrozen(book.embedding)).toBe(true);
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

    it('should update author', () => {
      const updated = book.update({ author: 'New Author' });
      expect(updated.author).toBe('New Author');
    });

    it('should update type', () => {
      const updated = book.update({ type: 'novel' });
      expect(updated.type.value).toBe('novel');
    });

    it('should update category', () => {
      const updated = book.update({ category: 'software-engineering' });
      expect(updated.category).toBe('software-engineering');
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

    it('should update description', () => {
      const updated = book.update({ description: 'New description' });
      expect(updated.description).toBe('New description');
    });

    it('should update embedding', () => {
      const newEmbedding = createValidEmbedding();
      const updated = book.update({ embedding: newEmbedding });
      expect(updated.embedding).toHaveLength(768);
    });

    it('should update multiple fields at once', () => {
      const updated = book.update({
        title: 'New Title',
        author: 'New Author',
        description: 'New Description',
      });

      expect(updated.title).toBe('New Title');
      expect(updated.author).toBe('New Author');
      expect(updated.description).toBe('New Description');
    });

    it('should preserve unchanged fields', () => {
      const updated = book.update({ title: 'New Title' });

      expect(updated.author).toBe(book.author);
      expect(updated.type.value).toBe(book.type.value);
      expect(updated.category).toBe(book.category);
      expect(updated.format.value).toBe(book.format.value);
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
      expect(() => book.update({ type: 'invalid' })).toThrow(InvalidBookTypeError);
    });
  });

  describe('withEmbedding', () => {
    it('should return a new Book with the embedding', () => {
      const book = Book.create(createValidBookProps());
      const embedding = createValidEmbedding();

      const updated = book.withEmbedding(embedding);

      expect(updated.embedding).toHaveLength(768);
      expect(book.embedding).toBeNull(); // Original unchanged
    });

    it('should update the updatedAt timestamp', () => {
      const book = Book.create(createValidBookProps());
      const embedding = createValidEmbedding();

      const before = new Date();
      const updated = book.withEmbedding(embedding);
      const after = new Date();

      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(updated.updatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should validate embedding dimensions', () => {
      const book = Book.create(createValidBookProps());

      expect(() => book.withEmbedding([1, 2, 3])).toThrow(InvalidEmbeddingError);
    });
  });

  describe('hasEmbedding', () => {
    it('should return true when embedding exists', () => {
      const book = Book.create(
        createValidBookProps({ embedding: createValidEmbedding() })
      );
      expect(book.hasEmbedding()).toBe(true);
    });

    it('should return false when embedding is null', () => {
      const book = Book.create(createValidBookProps());
      expect(book.hasEmbedding()).toBe(false);
    });
  });

  describe('getTextForEmbedding', () => {
    it('should combine title, author, and category', () => {
      const book = Book.create(createValidBookProps());
      const text = book.getTextForEmbedding();

      expect(text).toContain('Clean Code');
      expect(text).toContain('Robert C. Martin');
      expect(text).toContain('programming');
    });

    it('should include description when present', () => {
      const book = Book.create(
        createValidBookProps({ description: 'A great book about clean code' })
      );
      const text = book.getTextForEmbedding();

      expect(text).toContain('A great book about clean code');
    });

    it('should not include description when null', () => {
      const book = Book.create(createValidBookProps({ description: null }));
      const text = book.getTextForEmbedding();

      expect(text).toBe('Clean Code Robert C. Martin programming');
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
  });

  describe('immutability', () => {
    it('should be frozen', () => {
      const book = Book.create(createValidBookProps());
      expect(Object.isFrozen(book)).toBe(true);
    });

    it('should have frozen embedding', () => {
      const book = Book.create(
        createValidBookProps({ embedding: createValidEmbedding() })
      );
      expect(Object.isFrozen(book.embedding)).toBe(true);
    });

    it('should not allow property modification', () => {
      const book = Book.create(createValidBookProps());
      expect(() => {
        // @ts-expect-error - Testing runtime immutability
        book.title = 'New Title';
      }).toThrow();
    });
  });
});
