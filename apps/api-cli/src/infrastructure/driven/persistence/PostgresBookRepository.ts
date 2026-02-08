/**
 * PostgresBookRepository Adapter
 *
 * Implements the BookRepository port using Drizzle ORM with PostgreSQL.
 * This is a driven/output adapter in the hexagonal architecture.
 *
 * Handles:
 * - Book persistence with embedding vectors (pgvector)
 * - Duplicate detection via ISBN and normalized triad (author, title, format)
 * - Many-to-many relationship with categories via book_categories table
 */

import { eq, and, count } from 'drizzle-orm';
import type { Book } from '../../../domain/entities/Book.js';
import type { Category } from '../../../domain/entities/Category.js';
import { DuplicateISBNError, DuplicateBookError, BookNotFoundError } from '../../../domain/errors/DomainErrors.js';
import type {
  BookRepository,
  SaveBookParams,
  UpdateBookParams,
  DuplicateCheckResult,
} from '../../../application/ports/BookRepository.js';
import { books, bookCategories, categories, type BookSelect, type CategorySelect } from './drizzle/schema.js';
import { BookMapper } from './mappers/BookMapper.js';
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
    from: (table: typeof books | typeof bookCategories | typeof categories) => {
      where: (condition: unknown) => Promise<unknown[]>;
      innerJoin: (table: typeof categories, condition: unknown) => {
        where: (condition: unknown) => Promise<unknown[]>;
      };
    };
  };
  insert: (table: typeof books | typeof bookCategories) => {
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
  delete: (table: typeof books | typeof bookCategories) => {
    where: (condition: unknown) => Promise<{ rowCount: number }>;
  };
  query: {
    books: {
      findFirst: (options?: { where?: unknown }) => Promise<BookSelect | null>;
      findMany: (options?: { where?: unknown }) => Promise<BookSelect[]>;
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

    const bookCategories = await this.fetchCategoriesForBook(id);
    return BookMapper.toDomain(bookRecord, bookCategories);
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

    const bookCats = await this.fetchCategoriesForBook(bookRecord.id);
    return BookMapper.toDomain(bookRecord, bookCats);
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
   * Checks if a book with the given triad (author, title, format) already exists
   * The parameters should already be normalized by the caller.
   */
  async existsByTriad(author: string, title: string, format: string): Promise<boolean> {
    const result = await this.db
      .select({ count: count() })
      .from(books)
      .where(
        and(
          eq(books.normalizedAuthor, author),
          eq(books.normalizedTitle, title),
          eq(books.format, format)
        )
      ) as { count: number }[];

    return (result[0]?.count ?? 0) > 0;
  }

  /**
   * Performs a comprehensive duplicate check for both ISBN and triad
   */
  async checkDuplicate(params: {
    isbn?: string | null;
    author: string;
    title: string;
    format: string;
  }): Promise<DuplicateCheckResult> {
    // Check ISBN first if provided
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

    // Check triad (author + title + format)
    const triadExists = await this.existsByTriad(params.author, params.title, params.format);
    if (triadExists) {
      return {
        isDuplicate: true,
        duplicateType: 'triad',
        message: `A book by "${params.author}" titled "${params.title}" in format "${params.format}" already exists`,
      };
    }

    return { isDuplicate: false };
  }

  /**
   * Saves a new book with its embedding vector
   *
   * This operation:
   * 1. Normalizes author and title for duplicate detection
   * 2. Inserts the book record with embedding
   * 3. Creates book_categories relationships
   */
  async save(params: SaveBookParams): Promise<Book> {
    const { book, embedding } = params;

    const normalizedTitle = normalizeForDuplicateCheck(book.title);
    const normalizedAuthor = normalizeForDuplicateCheck(book.author);

    // Prepare book record
    const bookRecord = BookMapper.toPersistence({
      book,
      embedding,
      normalizedTitle,
      normalizedAuthor,
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

        // Insert book_categories relationships
        if (book.categories.length > 0) {
          const categoryRelations = book.categories.map((category) => ({
            bookId: book.id,
            categoryId: category.id,
          }));

          await tx.insert(bookCategories).values(categoryRelations).returning();
        }

        // Return the domain entity with categories
        return BookMapper.toDomain(insertedBook, [...book.categories]);
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

    const bookCats = await this.fetchCategoriesForBook(id);
    return BookMapper.toDomain(updatedBook, bookCats);
  }

  /**
   * Deletes a book by its ID
   */
  async delete(id: string): Promise<boolean> {
    // book_categories will be deleted via CASCADE
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

    // Fetch categories for all books
    const booksWithCategories = await Promise.all(
      bookRecords.map(async (record) => {
        const cats = await this.fetchCategoriesForBook(record.id);
        return BookMapper.toDomain(record, cats);
      })
    );

    return booksWithCategories;
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

      // Check if it's a triad duplicate
      if (errorMessage.includes('books_triad_unique_idx') || errorMessage.includes('triad')) {
        throw new DuplicateBookError(book.author, book.title, book.format.value);
      }

      // Generic duplicate error
      throw new DuplicateBookError(book.author, book.title, book.format.value);
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
