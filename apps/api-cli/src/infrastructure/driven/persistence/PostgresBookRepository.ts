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
 *
 * HU-008 CHANGES:
 * - Updated fetchTypeForBook to load levelIds from type_levels junction table
 * - Book now uses levelId (UUID FK to levels table) instead of level enum
 */

import { eq, count } from 'drizzle-orm';
import type { Book } from '../../../domain/entities/Book.js';
import type { Author } from '../../../domain/entities/Author.js';
import type { BookType } from '../../../domain/entities/BookType.js';
import type { Category } from '../../../domain/entities/Category.js';
import type { Criteria } from '../../../domain/criteria/Criteria.js';
import { DuplicateISBNError, BookNotFoundError } from '../../../domain/errors/DomainErrors.js';
import type {
  BookRepository,
  SaveBookParams,
  UpdateBookParams,
  DuplicateCheckResult,
  SearchBooksResult,
} from '../../../application/ports/BookRepository.js';
import {
  books,
  bookAuthors,
  bookCategories,
  authors,
  categories,
  types,
  typeLevels,
  type AuthorSelect,
  type CategorySelect,
  type TypeSelect,
} from './drizzle/schema.js';
import { BookMapper } from './mappers/BookMapper.js';
import { AuthorMapper } from './mappers/AuthorMapper.js';
import { TypeMapper, type TypeSelectWithLevels } from './mappers/TypeMapper.js';
import { CategoryMapper } from './mappers/CategoryMapper.js';
import { isDuplicateKeyError } from './utils.js';
import type { DatabaseClient } from './types.js';

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
 * PostgresBookRepository
 *
 * Adapter that implements BookRepository using Drizzle ORM.
 * Provides CRUD operations for books with duplicate detection and embedding storage.
 */
export class PostgresBookRepository implements BookRepository {
  constructor(readonly db: DatabaseClient) {}

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
          [...book.categories],
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

    return (result.rowCount ?? 0) > 0;
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
      }),
    );

    return booksWithRelations;
  }

  /**
   * Counts the total number of books
   */
  async count(): Promise<number> {
    const result = await this.db
      .select({ count: count() })
      .from(books) as { count: number }[];

    return result[0]?.count ?? 0;
  }

  /**
   * Searches books using the Criteria pattern
   *
   * Supports filtering, ordering, and cursor-based pagination.
   * When an embedding is provided, it enables semantic similarity search
   * with a minimum threshold of 70% similarity.
   *
   * @param _criteria - Domain criteria object with filters, order, limit, cursor
   * @param _embedding - Optional embedding vector for semantic search (SIMILAR_TO filter)
   * @returns Promise resolving to paginated search results with similarity scores
   *
   * @throws Error - Not implemented yet (Task 4: HU-012-T4)
   */
  async search(_criteria: Criteria, _embedding?: number[]): Promise<SearchBooksResult> {
    // TODO: Implement in Task 4 (HU-012-T4)
    // - Build WHERE clause from criteria filters
    // - Add pgvector similarity search when embedding is provided
    // - Apply ordering (similarity DESC for text search, title ASC otherwise)
    // - Implement cursor-based pagination
    throw new Error('PostgresBookRepository.search() not implemented yet - see Task HU-012-T4');
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
   * Fetches the type for a specific book, including its levelIds
   *
   * HU-008: Now loads levelIds from type_levels junction table
   */
  private async fetchTypeForBook(typeId: string): Promise<BookType | null> {
    const typeRecord = await this.db.query.types.findFirst({
      where: eq(types.id, typeId),
    });

    if (!typeRecord) {
      return null;
    }

    // HU-008: Load levelIds from type_levels junction table
    const levelIds = await this.loadLevelIdsForType(typeId);
    const recordWithLevels = this.combineTypeWithLevelIds(typeRecord, levelIds);

    return TypeMapper.toDomain(recordWithLevels);
  }

  /**
   * Loads levelIds for a single type from the type_levels junction table
   *
   * HU-008: Helper to support type-level relationship
   */
  private async loadLevelIdsForType(typeId: string): Promise<string[]> {
    const results = await this.db.query.typeLevels.findMany({
      where: eq(typeLevels.typeId, typeId),
    });
    return results.map((r) => r.levelId);
  }

  /**
   * Combines a type record with its levelIds to create a TypeSelectWithLevels
   *
   * HU-008: Helper to support type-level relationship
   */
  private combineTypeWithLevelIds(
    record: TypeSelect,
    levelIds: readonly string[],
  ): TypeSelectWithLevels {
    return {
      ...record,
      levelIds,
    };
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
    if (isDuplicateKeyError(error)) {
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
}
