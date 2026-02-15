/**
 * PostgresBookRepository Adapter
 *
 * Implements the BookRepository port using Drizzle ORM with PostgreSQL.
 * This is a driven/output adapter in the hexagonal architecture.
 *
 * Handles:
 * - Book persistence with embedding vectors (pgvector)
 * - Duplicate detection via ISBN (unique constraint)
 * - Many-to-many relationship with authors via book_authors table
 * - Many-to-many relationship with categories via book_categories table
 * - Many-to-one relationship with types via type_id FK
 *
 * HU-002 CHANGES:
 * - Added support for N:M authors relationship
 * - Added support for type_id FK to types table
 * - Removed triad duplicate detection (author+title+format)
 * - Duplicate detection now only uses ISBN
 */

import { eq, count } from 'drizzle-orm';
import type { Book } from '../../../domain/entities/Book.js';
import type { Author } from '../../../domain/entities/Author.js';
import type { BookType } from '../../../domain/entities/BookType.js';
import type { Category } from '../../../domain/entities/Category.js';
import { DuplicateISBNError, BookNotFoundError } from '../../../domain/errors/DomainErrors.js';
import type {
  BookRepository,
  SaveBookParams,
  UpdateBookParams,
  DuplicateCheckResult,
} from '../../../application/ports/BookRepository.js';
import {
  books,
  bookAuthors,
  bookCategories,
  authors,
  categories,
  types,
  type BookSelect,
  type AuthorSelect,
  type TypeSelect,
  type CategorySelect,
} from './drizzle/schema.js';
import { BookMapper } from './mappers/BookMapper.js';
import { AuthorMapper } from './mappers/AuthorMapper.js';
import { TypeMapper } from './mappers/TypeMapper.js';
import { CategoryMapper } from './mappers/CategoryMapper.js';

/**
 * Normalizes text for duplicate detection
 *
 * Applies consistent transformations:
 * - Lowercase conversion
 * - NFD normalization (decompose accented characters)
 * - Remove diacritical marks
 * - Keep only alphanumeric characters and spaces
 * - Normalize multiple spaces to single space
 * - Trim whitespace
 */
export function normalizeForDuplicateCheck(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritical marks
    .replace(/[^a-z0-9\s]/g, '')     // Keep only alphanumeric and spaces
    .replace(/\s+/g, ' ')            // Normalize multiple spaces
    .trim();
}

/**
 * Database type that supports our operations
 * This is a generic interface that works with any Drizzle PostgreSQL connection
 */
interface DrizzleDb {
  select: (fields?: Record<string, unknown>) => {
    from: (table: typeof books | typeof bookAuthors | typeof bookCategories | typeof authors | typeof categories | typeof types) => {
      where: (condition: unknown) => Promise<unknown[]>;
      innerJoin: (table: typeof authors | typeof categories | typeof types, condition: unknown) => {
        where: (condition: unknown) => Promise<unknown[]>;
      };
    };
  };
  insert: (table: typeof books | typeof bookAuthors | typeof bookCategories) => {
    values: (data: unknown) => {
      returning: () => Promise<BookSelect[]>;
    };
  };
  update: (table: typeof books) => {
    set: (data: unknown) => {
      where: (condition: unknown) => {
        returning: () => Promise<BookSelect[]>;
      };
    };
  };
  delete: (table: typeof books | typeof bookAuthors | typeof bookCategories) => {
    where: (condition: unknown) => Promise<{ rowCount: number }>;
  };
  query: {
    books: {
      findFirst: (options?: { where?: unknown }) => Promise<BookSelect | null>;
      findMany: (options?: { where?: unknown }) => Promise<BookSelect[]>;
    };
    types: {
      findFirst: (options?: { where?: unknown }) => Promise<TypeSelect | null>;
    };
  };
  // Transaction support
  transaction: <T>(fn: (tx: DrizzleDb) => Promise<T>) => Promise<T>;
}

/**
 * PostgresBookRepository
 *
 * Adapter that implements BookRepository using Drizzle ORM.
 * Provides CRUD operations for books with duplicate detection and embedding storage.
 */
export class PostgresBookRepository implements BookRepository {
  constructor(readonly db: DrizzleDb) {}

  /**
   * Finds a book by its unique identifier
   */
  async findById(id: string): Promise<Book | null> {
    const bookRecord = await this.db.query.books.findFirst({
      where: eq(books.id, id),
    });

    if (!bookRecord) {
      return null;
    }

    const [bookAuthors, bookType, bookCategories] = await Promise.all([
      this.fetchAuthorsForBook(id),
      this.fetchTypeForBook(bookRecord.typeId),
      this.fetchCategoriesForBook(id),
    ]);

    if (!bookType) {
      throw new Error(`Book type not found for type_id: ${bookRecord.typeId}`);
    }

    return BookMapper.toDomain(bookRecord, bookAuthors, bookType, bookCategories);
  }

  /**
   * Finds a book by its ISBN
   */
  async findByIsbn(isbn: string): Promise<Book | null> {
    const bookRecord = await this.db.query.books.findFirst({
      where: eq(books.isbn, isbn),
    });

    if (!bookRecord) {
      return null;
    }

    const [bookAuthors, bookType, bookCategories] = await Promise.all([
      this.fetchAuthorsForBook(bookRecord.id),
      this.fetchTypeForBook(bookRecord.typeId),
      this.fetchCategoriesForBook(bookRecord.id),
    ]);

    if (!bookType) {
      throw new Error(`Book type not found for type_id: ${bookRecord.typeId}`);
    }

    return BookMapper.toDomain(bookRecord, bookAuthors, bookType, bookCategories);
  }

  /**
   * Checks if a book with the given ISBN already exists
   */
  async existsByIsbn(isbn: string): Promise<boolean> {
    const result = await this.db
      .select({ count: count() })
      .from(books)
      .where(eq(books.isbn, isbn)) as { count: number }[];

    return (result[0]?.count ?? 0) > 0;
  }

  /**
   * Performs a duplicate check based on ISBN
   * 
   * Note: Triad duplicate detection (author+title+format) has been removed in HU-002.
   * With multiple authors, this constraint no longer makes sense.
   * Duplicate detection is now based solely on ISBN uniqueness.
   */
  async checkDuplicate(params: {
    isbn?: string | null;
  }): Promise<DuplicateCheckResult> {
    // Check ISBN if provided
    if (params.isbn) {
      const isbnExists = await this.existsByIsbn(params.isbn);
      if (isbnExists) {
        return {
          isDuplicate: true,
          duplicateType: 'isbn',
          message: `A book with ISBN ${params.isbn} already exists`,
        };
      }
    }

    return { isDuplicate: false };
  }

  /**
   * Saves a new book with its embedding vector
   *
   * This operation:
   * 1. Inserts the book record with embedding
   * 2. Creates book_authors relationships
   * 3. Creates book_categories relationships
   */
  async save(params: SaveBookParams): Promise<Book> {
    const { book, embedding } = params;

    const normalizedTitle = normalizeForDuplicateCheck(book.title);

    // Prepare book record
    const bookRecord = BookMapper.toPersistence({
      book,
      embedding,
      normalizedTitle,
    });

    try {
      // Use transaction to ensure atomicity
      return await this.db.transaction(async (tx) => {
        // Insert book
        const insertedBooks = await tx
          .insert(books)
          .values(bookRecord)
          .returning();

        const insertedBook = insertedBooks[0];
        if (!insertedBook) {
          throw new Error('Failed to insert book - no record returned');
        }

        // Insert book_authors relationships
        if (book.authors.length > 0) {
          const authorRelations = book.authors.map((author) => ({
            bookId: book.id,
            authorId: author.id,
          }));

          await tx.insert(bookAuthors).values(authorRelations).returning();
        }

        // Insert book_categories relationships
        if (book.categories.length > 0) {
          const categoryRelations = book.categories.map((category) => ({
            bookId: book.id,
            categoryId: category.id,
          }));

          await tx.insert(bookCategories).values(categoryRelations).returning();
        }

        // Return the domain entity with all relations
        return BookMapper.toDomain(
          insertedBook,
          [...book.authors],
          book.type,
          [...book.categories]
        );
      });
    } catch (error) {
      this.handleSaveError(error, book);
      throw error; // Re-throw if not handled
    }
  }

  /**
   * Updates an existing book's mutable fields (available, path)
   */
  async update(params: UpdateBookParams): Promise<Book> {
    const { id } = params;

    // Build update object only with provided fields
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if ('available' in params) {
      updateData['available'] = params.available;
    }

    if ('path' in params) {
      updateData['path'] = params.path;
    }

    const updatedBooks = await this.db
      .update(books)
      .set(updateData)
      .where(eq(books.id, id))
      .returning();

    const updatedBook = updatedBooks[0];
    if (!updatedBook) {
      throw new BookNotFoundError(id);
    }

    const [bookAuthors, bookType, bookCategories] = await Promise.all([
      this.fetchAuthorsForBook(id),
      this.fetchTypeForBook(updatedBook.typeId),
      this.fetchCategoriesForBook(id),
    ]);

    if (!bookType) {
      throw new Error(`Book type not found for type_id: ${updatedBook.typeId}`);
    }

    return BookMapper.toDomain(updatedBook, bookAuthors, bookType, bookCategories);
  }

  /**
   * Deletes a book by its ID
   */
  async delete(id: string): Promise<boolean> {
    // book_authors and book_categories will be deleted via CASCADE
    const result = await this.db
      .delete(books)
      .where(eq(books.id, id));

    return result.rowCount > 0;
  }

  /**
   * Retrieves all books (without embeddings in domain)
   */
  async findAll(): Promise<Book[]> {
    const bookRecords = await this.db.query.books.findMany();

    // Fetch relations for all books
    const booksWithRelations = await Promise.all(
      bookRecords.map(async (record) => {
        const [bookAuthors, bookType, bookCategories] = await Promise.all([
          this.fetchAuthorsForBook(record.id),
          this.fetchTypeForBook(record.typeId),
          this.fetchCategoriesForBook(record.id),
        ]);

        if (!bookType) {
          throw new Error(`Book type not found for type_id: ${record.typeId}`);
        }

        return BookMapper.toDomain(record, bookAuthors, bookType, bookCategories);
      })
    );

    return booksWithRelations;
  }

  /**
   * Counts the total number of books
   */
  async count(): Promise<number> {
    const result = await this.db
      .select({ count: count() })
      .from(books)
      .where(eq(books.id, books.id)) as { count: number }[]; // Always true condition to count all

    return result[0]?.count ?? 0;
  }

  // ==================== Private Helpers ====================

  /**
   * Fetches authors for a specific book
   */
  private async fetchAuthorsForBook(bookId: string): Promise<Author[]> {
    const results = await this.db
      .select()
      .from(bookAuthors)
      .innerJoin(authors, eq(bookAuthors.authorId, authors.id))
      .where(eq(bookAuthors.bookId, bookId)) as { authors: AuthorSelect }[];

    return results.map((r) => AuthorMapper.toDomain(r.authors));
  }

  /**
   * Fetches the type for a specific book
   */
  private async fetchTypeForBook(typeId: string): Promise<BookType | null> {
    const typeRecord = await this.db.query.types.findFirst({
      where: eq(types.id, typeId),
    });

    if (!typeRecord) {
      return null;
    }

    return TypeMapper.toDomain(typeRecord);
  }

  /**
   * Fetches categories for a specific book
   */
  private async fetchCategoriesForBook(bookId: string): Promise<Category[]> {
    const results = await this.db
      .select()
      .from(bookCategories)
      .innerJoin(categories, eq(bookCategories.categoryId, categories.id))
      .where(eq(bookCategories.bookId, bookId)) as { categories: CategorySelect }[];

    return results.map((r) => CategoryMapper.toDomain(r.categories));
  }

  /**
   * Handles save errors, converting database errors to domain errors
   */
  private handleSaveError(error: unknown, book: Book): never {
    if (this.isDuplicateKeyError(error)) {
      const errorMessage = error instanceof Error ? error.message : '';

      // Check if it's an ISBN duplicate
      if (errorMessage.includes('books_isbn_unique_idx') || errorMessage.includes('isbn')) {
        throw new DuplicateISBNError(book.isbn?.value ?? 'unknown');
      }

      // Generic duplicate error - treat as ISBN duplicate
      throw new DuplicateISBNError(book.isbn?.value ?? 'unknown');
    }

    throw error;
  }

  /**
   * Checks if an error is a duplicate key violation
   */
  private isDuplicateKeyError(error: unknown): boolean {
    if (error instanceof Error) {
      return (
        error.message.includes('duplicate key') ||
        error.message.includes('unique constraint') ||
        error.message.includes('UNIQUE constraint')
      );
    }
    return false;
  }
}
