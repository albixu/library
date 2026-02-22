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

import { eq, count, and, ilike, sql, asc, desc } from 'drizzle-orm';
import type { Book } from '../../../domain/entities/Book.js';
import type { Author } from '../../../domain/entities/Author.js';
import type { BookType } from '../../../domain/entities/BookType.js';
import type { Category } from '../../../domain/entities/Category.js';
import type { Criteria } from '../../../domain/criteria/Criteria.js';
import type { Filter } from '../../../domain/criteria/Filter.js';
import { DuplicateISBNError, BookNotFoundError } from '../../../domain/errors/DomainErrors.js';
import type {
  BookRepository,
  SaveBookParams,
  UpdateBookParams,
  DuplicateCheckResult,
  SearchBooksResult,
  BookWithScore,
} from '../../../application/ports/BookRepository.js';
import {
  books,
  bookAuthors,
  bookCategories,
  authors,
  categories,
  types,
  typeLevels,
  levels,
  type AuthorSelect,
  type CategorySelect,
  type TypeSelect,
  type BookSelect,
} from './drizzle/schema.js';
import { BookMapper } from './mappers/BookMapper.js';
import { AuthorMapper } from './mappers/AuthorMapper.js';
import { TypeMapper, type TypeSelectWithLevels } from './mappers/TypeMapper.js';
import { CategoryMapper } from './mappers/CategoryMapper.js';
import { isDuplicateKeyError } from './utils.js';
import type { DatabaseClient } from './types.js';

/**
 * Cursor data structure for cursor-based pagination
 */
interface CursorData {
  /** Last book ID seen (for tie-breaking) */
  lastId: string;
  /** Last value of the sort field (e.g., title) */
  lastValue: string;
  /** Last similarity score (for semantic search pagination) */
  lastScore?: number;
}

/**
 * Raw result row from search query
 */
interface SearchResultRow {
  id: string;
  isbn: string | null;
  title: string;
  description: string;
  typeId: string;
  format: string;
  levelId: string | null;
  available: boolean;
  path: string | null;
  normalizedTitle: string;
  createdAt: Date;
  updatedAt: Date;
  similarity_score: number | null;
}

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
   * @param criteria - Domain criteria object with filters, order, limit, cursor
   * @param embedding - Optional embedding vector for semantic search (SIMILAR_TO filter)
   * @returns Promise resolving to paginated search results with similarity scores
   */
  async search(criteria: Criteria, embedding?: number[]): Promise<SearchBooksResult> {
    const hasEmbedding = embedding !== undefined && embedding.length > 0;
    const SIMILARITY_THRESHOLD = 0.7;

    // Build where conditions from criteria filters
    const whereConditions = this.buildWhereConditions(criteria, embedding, SIMILARITY_THRESHOLD);

    // Build the order by clause
    const orderByClause = this.buildOrderByClause(criteria, hasEmbedding);

    // Parse cursor if present
    const cursorData = this.parseCursor(criteria.cursor);

    // Get total count first (with filters but without pagination)
    const totalCount = await this.getFilteredCount(whereConditions);

    // Fetch paginated results
    const limit = criteria.limit;
    // Fetch one extra to determine hasNextPage
    const fetchLimit = limit + 1;

    const results = await this.executeSearchQuery(
      whereConditions,
      orderByClause,
      fetchLimit,
      cursorData,
      embedding,
      hasEmbedding,
    );

    // Determine if there's a next page
    const hasNextPage = results.length > limit;
    const items = results.slice(0, limit);

    // Build books with scores
    const booksWithScores = await this.mapResultsToBooksWithScores(items, hasEmbedding);

    // Generate next cursor
    const lastItem = items[items.length - 1];
    const nextCursor = hasNextPage && lastItem
      ? this.generateCursor(lastItem, hasEmbedding)
      : null;

    return {
      items: booksWithScores,
      totalCount,
      hasNextPage,
      nextCursor,
    };
  }

  // ==================== Search Helper Methods ====================

  /**
   * Builds WHERE conditions from Criteria filters
   */
  private buildWhereConditions(
    criteria: Criteria,
    embedding: number[] | undefined,
    similarityThreshold: number,
  ): ReturnType<typeof and> {
    const conditions: ReturnType<typeof eq>[] = [];

    // Process each filter
    for (const filter of criteria.filters.getAll()) {
      const condition = this.filterToCondition(filter);
      if (condition) {
        conditions.push(condition);
      }
    }

    // Add similarity threshold if embedding provided
    if (embedding && embedding.length > 0) {
      const embeddingStr = `[${embedding.join(',')}]`;
      conditions.push(
        sql`1 - (${books.embedding} <=> ${embeddingStr}::vector) >= ${similarityThreshold}`,
      );
    }

    return conditions.length > 0 ? and(...conditions) : undefined;
  }

  /**
   * Converts a domain Filter to a Drizzle SQL condition
   */
  private filterToCondition(filter: Filter): ReturnType<typeof eq> | undefined {
    const field = filter.field.value;
    const operator = filter.operator.value;
    const value = filter.value.value;

    switch (field) {
      case 'isbn':
        if (operator === 'EQUALS' && typeof value === 'string') {
          return eq(books.isbn, value);
        }
        break;

      case 'title':
        if (operator === 'CONTAINS' && typeof value === 'string') {
          return ilike(books.title, `%${value}%`);
        }
        break;

      case 'author':
        if (operator === 'CONTAINS' && typeof value === 'string') {
          // Subquery: book has at least one author whose name contains the value
          return sql`EXISTS (
            SELECT 1 FROM ${bookAuthors}
            INNER JOIN ${authors} ON ${bookAuthors.authorId} = ${authors.id}
            WHERE ${bookAuthors.bookId} = ${books.id}
            AND LOWER(${authors.name}) LIKE LOWER(${`%${value}%`})
          )`;
        }
        break;

      case 'type':
        if (operator === 'IN' && Array.isArray(value)) {
          const lowerValues = (value as string[]).map(v => v.toLowerCase());
          // Subquery: book's type name is in the list (case-insensitive)
          return sql`EXISTS (
            SELECT 1 FROM ${types}
            WHERE ${types.id} = ${books.typeId}
            AND LOWER(${types.name}) IN (${sql.join(lowerValues.map(v => sql`${v}`), sql`, `)})
          )`;
        }
        break;

      case 'categories':
        if (operator === 'IN' && Array.isArray(value)) {
          const lowerValues = (value as string[]).map(v => v.toLowerCase());
          // Subquery: book has at least one category whose name is in the list
          return sql`EXISTS (
            SELECT 1 FROM ${bookCategories}
            INNER JOIN ${categories} ON ${bookCategories.categoryId} = ${categories.id}
            WHERE ${bookCategories.bookId} = ${books.id}
            AND LOWER(${categories.name}) IN (${sql.join(lowerValues.map(v => sql`${v}`), sql`, `)})
          )`;
        }
        break;

      case 'levels':
        if (operator === 'IN' && Array.isArray(value)) {
          const lowerValues = (value as string[]).map(v => v.toLowerCase());
          // Subquery: book's level name is in the list (case-insensitive)
          return sql`EXISTS (
            SELECT 1 FROM ${levels}
            WHERE ${levels.id} = ${books.levelId}
            AND LOWER(${levels.name}) IN (${sql.join(lowerValues.map(v => sql`${v}`), sql`, `)})
          )`;
        }
        break;

      case 'embedding':
        // SIMILAR_TO operator is handled separately in buildWhereConditions
        break;
    }

    return undefined;
  }

  /**
   * Builds ORDER BY clause based on criteria and embedding presence
   */
  private buildOrderByClause(
    criteria: Criteria,
    hasEmbedding: boolean,
  ): 'similarity_desc' | 'title_asc' | 'title_desc' | 'custom_asc' | 'custom_desc' {
    // If embedding is provided, order by similarity descending
    if (hasEmbedding) {
      return 'similarity_desc';
    }

    // Check if criteria has explicit order
    if (criteria.hasOrder() && !criteria.order.isNone()) {
      const field = criteria.order.orderBy.value;
      const direction = criteria.order.orderType.value;

      if (field === 'title') {
        return direction === 'DESC' ? 'title_desc' : 'title_asc';
      }

      // For other fields, fall back to title
      return direction === 'DESC' ? 'custom_desc' : 'custom_asc';
    }

    // Default: order by title ascending
    return 'title_asc';
  }

  /**
   * Parses cursor string to cursor data
   */
  private parseCursor(cursor: string | null): CursorData | null {
    if (!cursor) {
      return null;
    }

    try {
      const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
      return JSON.parse(decoded) as CursorData;
    } catch {
      return null;
    }
  }

  /**
   * Generates cursor for next page
   */
  private generateCursor(
    lastResult: SearchResultRow,
    hasEmbedding: boolean,
  ): string {
    const cursorData: CursorData = {
      lastId: lastResult.id,
      lastValue: lastResult.title,
    };

    if (hasEmbedding && lastResult.similarity_score !== null) {
      cursorData.lastScore = lastResult.similarity_score;
    }

    return Buffer.from(JSON.stringify(cursorData)).toString('base64');
  }

  /**
   * Gets filtered count (total matching records)
   */
  private async getFilteredCount(
    whereConditions: ReturnType<typeof and>,
  ): Promise<number> {
    const result = await this.db
      .select({ count: count() })
      .from(books)
      .where(whereConditions) as { count: number }[];

    return result[0]?.count ?? 0;
  }

  /**
   * Executes the main search query with all conditions
   */
  private async executeSearchQuery(
    whereConditions: ReturnType<typeof and>,
    orderBy: 'similarity_desc' | 'title_asc' | 'title_desc' | 'custom_asc' | 'custom_desc',
    limit: number,
    cursor: CursorData | null,
    embedding: number[] | undefined,
    hasEmbedding: boolean,
  ): Promise<SearchResultRow[]> {
    // Build cursor condition
    const cursorCondition = cursor
      ? this.buildCursorCondition(cursor, orderBy, hasEmbedding)
      : undefined;

    // Combine where conditions with cursor
    const finalWhere = cursorCondition
      ? and(whereConditions, cursorCondition)
      : whereConditions;

    // Build similarity score expression if embedding provided
    const similarityExpr = hasEmbedding && embedding
      ? sql<number>`1 - (${books.embedding} <=> ${`[${embedding.join(',')}]`}::vector)`
      : sql<null>`NULL`;

    // Determine order expression
    const orderExpr = this.getOrderExpression(orderBy, hasEmbedding, embedding);

    const results = await this.db
      .select({
        id: books.id,
        isbn: books.isbn,
        title: books.title,
        description: books.description,
        typeId: books.typeId,
        format: books.format,
        levelId: books.levelId,
        available: books.available,
        path: books.path,
        normalizedTitle: books.normalizedTitle,
        createdAt: books.createdAt,
        updatedAt: books.updatedAt,
        similarity_score: similarityExpr,
      })
      .from(books)
      .where(finalWhere)
      .orderBy(...orderExpr)
      .limit(limit);

    return results as SearchResultRow[];
  }

  /**
   * Builds cursor condition for pagination
   */
  private buildCursorCondition(
    cursor: CursorData,
    orderBy: 'similarity_desc' | 'title_asc' | 'title_desc' | 'custom_asc' | 'custom_desc',
    hasEmbedding: boolean,
  ): ReturnType<typeof sql> {
    if (hasEmbedding && cursor.lastScore !== undefined) {
      // For similarity ordering: (score, id) < (lastScore, lastId)
      return sql`(
        1 - (${books.embedding} <=> '[${sql.raw(cursor.lastScore.toString())}]'::vector) < ${cursor.lastScore}
        OR (
          1 - (${books.embedding} <=> '[${sql.raw(cursor.lastScore.toString())}]'::vector) = ${cursor.lastScore}
          AND ${books.id} > ${cursor.lastId}
        )
      )`;
    }

    // For title ordering
    if (orderBy === 'title_desc') {
      return sql`(
        ${books.title} < ${cursor.lastValue}
        OR (${books.title} = ${cursor.lastValue} AND ${books.id} > ${cursor.lastId})
      )`;
    }

    // Default: title ascending
    return sql`(
      ${books.title} > ${cursor.lastValue}
      OR (${books.title} = ${cursor.lastValue} AND ${books.id} > ${cursor.lastId})
    )`;
  }

  /**
   * Gets ORDER BY expressions based on order type
   */
  private getOrderExpression(
    orderBy: 'similarity_desc' | 'title_asc' | 'title_desc' | 'custom_asc' | 'custom_desc',
    hasEmbedding: boolean,
    embedding: number[] | undefined,
  ): ReturnType<typeof asc>[] {
    if (hasEmbedding && embedding) {
      // Order by similarity descending, then title, then id for tie-breaking
      return [
        sql`1 - (${books.embedding} <=> ${`[${embedding.join(',')}]`}::vector) DESC`,
        asc(books.title),
        asc(books.id),
      ] as ReturnType<typeof asc>[];
    }

    switch (orderBy) {
      case 'title_desc':
        return [desc(books.title), asc(books.id)];
      case 'title_asc':
      default:
        return [asc(books.title), asc(books.id)];
    }
  }

  /**
   * Maps search result rows to BookWithScore objects
   */
  private async mapResultsToBooksWithScores(
    results: SearchResultRow[],
    hasEmbedding: boolean,
  ): Promise<BookWithScore[]> {
    const booksWithScores: BookWithScore[] = [];

    for (const row of results) {
      const [bookAuthors, bookType, bookCategories] = await Promise.all([
        this.fetchAuthorsForBook(row.id),
        this.fetchTypeForBook(row.typeId),
        this.fetchCategoriesForBook(row.id),
      ]);

      if (!bookType) {
        throw new Error(`Book type not found for type_id: ${row.typeId}`);
      }

      // Convert row to BookSelect format
      const bookRecord: BookSelect = {
        id: row.id,
        isbn: row.isbn,
        title: row.title,
        description: row.description,
        typeId: row.typeId,
        format: row.format,
        levelId: row.levelId,
        available: row.available,
        path: row.path,
        embedding: null, // Not needed for domain mapping
        normalizedTitle: row.normalizedTitle,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };

      const book = BookMapper.toDomain(bookRecord, bookAuthors, bookType, bookCategories);

      booksWithScores.push({
        book,
        similarityScore: hasEmbedding ? row.similarity_score : null,
      });
    }

    return booksWithScores;
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
