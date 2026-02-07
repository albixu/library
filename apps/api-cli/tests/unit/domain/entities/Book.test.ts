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
      expect(book.author).toBe('Robert C. Martin');
      expect(book.type.value).toBe('technical');
      expect(book.category).toBe('programming');
      expect(book.format.value).toBe('pdf');
      expect(book.isbn).toBeNull();
      expect(book.description).toBeNull();
      expect(book.available).toBe(false);
      expect(book.path).toBeNull();
    });

    it('should create a Book with all optional fields', () => {
      const props = createValidBookProps({
        isbn: validISBN,
        description: 'A handbook of agile software craftsmanship',
        available: true,
        path: '/books/clean-code.pdf',
      });

      const book = Book.create(props);

      expect(book.isbn?.value).toBe(validISBN);
      expect(book.description).toBe('A handbook of agile software craftsmanship');
      expect(book.available).toBe(true);
      expect(book.path).toBe('/books/clean-code.pdf');
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

      describe('available', () => {
        it('should default to false when not provided', () => {
          const book = Book.create(createValidBookProps());
          expect(book.available).toBe(false);
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
      expect(book.type.value).toBe('technical');
      expect(book.available).toBe(false);
      expect(book.path).toBeNull();
    });

    it('should reconstruct a Book with all fields', () => {
      const props = createValidPersistenceProps({
        isbn: validISBN,
        description: 'A great book',
        available: true,
        path: '/books/clean-code.pdf',
      });

      const book = Book.fromPersistence(props);

      expect(book.isbn?.value).toBe(validISBN);
      expect(book.description).toBe('A great book');
      expect(book.available).toBe(true);
      expect(book.path).toBe('/books/clean-code.pdf');
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
      expect(updated.available).toBe(book.available);
      expect(updated.path).toBe(book.path);
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

    it('should not allow property modification', () => {
      const book = Book.create(createValidBookProps());
      expect(() => {
        // @ts-expect-error - Testing runtime immutability
        book.title = 'New Title';
      }).toThrow();
    });
  });
});
