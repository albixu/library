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
import { SEMANTIC_SEARCH } from '../../../domain/criteria/constants.js';
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
 * HU-013: Added originalDescription and language fields
 */
interface SearchResultRow {
  id: string;
  isbn: string | null;
  title: string;
  originalDescription: string; // HU-013
  description: string; // HU-013: Spanish description
  language: string; // HU-013: ISO 639-1 code
  typeId: string;
  format: string;
  levelId: string | null;
  levelName: string | null;
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

    // Build where conditions from criteria filters
    const whereConditions = this.buildWhereConditions(
      criteria,
      embedding,
      SEMANTIC_SEARCH.SIMILARITY_THRESHOLD,
    );

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
   *
   * Uses normalizedTitle (instead of raw title) as the pagination anchor so that
   * cursor comparisons are consistent with the ORDER BY expression.
   * Raw titles with accents or mixed case can break keyset pagination when the
   * DB collation differs from the application's sort assumption.
   */
  private generateCursor(
    lastResult: SearchResultRow,
    hasEmbedding: boolean,
  ): string {
    const cursorData: CursorData = {
      lastId: lastResult.id,
      lastValue: lastResult.normalizedTitle,
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
    // Build cursor condition (pass embedding for similarity pagination)
    const cursorCondition = cursor
      ? this.buildCursorCondition(cursor, orderBy, hasEmbedding, embedding)
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
        originalDescription: books.originalDescription, // HU-013
        description: books.description, // HU-013: Spanish description
        language: books.language, // HU-013
        typeId: books.typeId,
        format: books.format,
        levelId: books.levelId,
        levelName: levels.name,
        available: books.available,
        path: books.path,
        normalizedTitle: books.normalizedTitle,
        createdAt: books.createdAt,
        updatedAt: books.updatedAt,
        similarity_score: similarityExpr,
      })
      .from(books)
      .leftJoin(levels, eq(books.levelId, levels.id))
      .where(finalWhere)
      .orderBy(...orderExpr)
      .limit(limit);

    return results as SearchResultRow[];
  }

  /**
   * Builds cursor condition for pagination
   *
   * For similarity-based pagination, we compare the current book's similarity score
   * (calculated using the original query embedding) against the last seen score.
   */
  private buildCursorCondition(
    cursor: CursorData,
    orderBy: 'similarity_desc' | 'title_asc' | 'title_desc' | 'custom_asc' | 'custom_desc',
    hasEmbedding: boolean,
    embedding?: number[],
  ): ReturnType<typeof sql> {
    if (hasEmbedding && cursor.lastScore !== undefined && embedding) {
      // For similarity ordering (DESC): get books with lower similarity scores,
      // or same score but higher ID (for tie-breaking)
      const embeddingStr = `[${embedding.join(',')}]`;
      return sql`(
        1 - (${books.embedding} <=> ${embeddingStr}::vector) < ${cursor.lastScore}
        OR (
          1 - (${books.embedding} <=> ${embeddingStr}::vector) = ${cursor.lastScore}
          AND ${books.id} > ${cursor.lastId}
        )
      )`;
    }

    // For title ordering
    if (orderBy === 'title_desc') {
      return sql`(
        ${books.normalizedTitle} < ${cursor.lastValue}
        OR (${books.normalizedTitle} = ${cursor.lastValue} AND ${books.id} > ${cursor.lastId})
      )`;
    }

    // Default: title ascending
    return sql`(
      ${books.normalizedTitle} > ${cursor.lastValue}
      OR (${books.normalizedTitle} = ${cursor.lastValue} AND ${books.id} > ${cursor.lastId})
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
      // Order by similarity descending, then normalizedTitle, then id for tie-breaking
      return [
        sql`1 - (${books.embedding} <=> ${`[${embedding.join(',')}]`}::vector) DESC`,
        asc(books.normalizedTitle),
        asc(books.id),
      ] as ReturnType<typeof asc>[];
    }

    switch (orderBy) {
      case 'title_desc':
        return [desc(books.normalizedTitle), asc(books.id)];
      case 'title_asc':
      default:
        return [asc(books.normalizedTitle), asc(books.id)];
    }
  }

  /**
   * Maps search result rows to BookWithScore objects
   *
   * Uses batch loading to avoid N+1 query problem:
   * - 1 query for all authors (instead of N)
   * - 1 query for all types (instead of N)
   * - 1 query for all categories (instead of N)
   * - 1 query for type-level relationships
   */
  private async mapResultsToBooksWithScores(
    results: SearchResultRow[],
    hasEmbedding: boolean,
  ): Promise<BookWithScore[]> {
    if (results.length === 0) {
      return [];
    }

    // Extract unique IDs for batch loading
    const bookIds = results.map((r) => r.id);
    const typeIds = [...new Set(results.map((r) => r.typeId))];

    // Batch load all relations in parallel (3 queries instead of N*3)
    const [authorsMap, typesMap, categoriesMap] = await Promise.all([
      this.fetchAuthorsForBooks(bookIds),
      this.fetchTypesWithLevels(typeIds),
      this.fetchCategoriesForBooks(bookIds),
    ]);

    // Map results to BookWithScore
    return results.map((row) => {
      const bookAuthors = authorsMap.get(row.id) ?? [];
      const bookType = typesMap.get(row.typeId);
      const bookCategories = categoriesMap.get(row.id) ?? [];

      if (!bookType) {
        throw new Error(`Book type not found for type_id: ${row.typeId}`);
      }

      // Convert row to BookSelect format
      const bookRecord: BookSelect = {
        id: row.id,
        isbn: row.isbn,
        title: row.title,
        originalDescription: row.originalDescription, // HU-013
        description: row.description, // HU-013: Spanish description
        language: row.language, // HU-013
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

      return {
        book,
        similarityScore: hasEmbedding ? row.similarity_score : null,
        levelName: row.levelName,
      };
    });
  }

  // ==================== Batch Loading Methods ====================

  /**
   * Batch loads authors for multiple books in a single query
   * Returns a Map of bookId -> Author[]
   */
  private async fetchAuthorsForBooks(bookIds: string[]): Promise<Map<string, Author[]>> {
    if (bookIds.length === 0) {
      return new Map();
    }

    const results = await this.db
      .select({
        bookId: bookAuthors.bookId,
        author: authors,
      })
      .from(bookAuthors)
      .innerJoin(authors, eq(bookAuthors.authorId, authors.id))
      .where(sql`${bookAuthors.bookId} IN (${sql.join(bookIds.map(id => sql`${id}`), sql`, `)})`);

    // Group by bookId
    const authorsMap = new Map<string, Author[]>();
    for (const row of results) {
      const author = AuthorMapper.toDomain(row.author);
      const existing = authorsMap.get(row.bookId) ?? [];
      existing.push(author);
      authorsMap.set(row.bookId, existing);
    }

    return authorsMap;
  }

  /**
   * Batch loads types with their levelIds for multiple type IDs
   * Returns a Map of typeId -> BookType
   */
  private async fetchTypesWithLevels(typeIds: string[]): Promise<Map<string, BookType>> {
    if (typeIds.length === 0) {
      return new Map();
    }

    // Load types
    const typeResults = await this.db
      .select()
      .from(types)
      .where(sql`${types.id} IN (${sql.join(typeIds.map(id => sql`${id}`), sql`, `)})`);

    // Load type-level relationships for all types
    const typeLevelResults = await this.db
      .select({
        typeId: typeLevels.typeId,
        levelId: typeLevels.levelId,
      })
      .from(typeLevels)
      .where(sql`${typeLevels.typeId} IN (${sql.join(typeIds.map(id => sql`${id}`), sql`, `)})`);

    // Group levelIds by typeId
    const levelIdsByType = new Map<string, string[]>();
    for (const row of typeLevelResults) {
      const existing = levelIdsByType.get(row.typeId) ?? [];
      existing.push(row.levelId);
      levelIdsByType.set(row.typeId, existing);
    }

    // Build type map
    const typesMap = new Map<string, BookType>();
    for (const typeRecord of typeResults) {
      const levelIds = levelIdsByType.get(typeRecord.id) ?? [];
      const recordWithLevels = this.combineTypeWithLevelIds(typeRecord, levelIds);
      typesMap.set(typeRecord.id, TypeMapper.toDomain(recordWithLevels));
    }

    return typesMap;
  }

  /**
   * Batch loads categories for multiple books in a single query
   * Returns a Map of bookId -> Category[]
   */
  private async fetchCategoriesForBooks(bookIds: string[]): Promise<Map<string, Category[]>> {
    if (bookIds.length === 0) {
      return new Map();
    }

    const results = await this.db
      .select({
        bookId: bookCategories.bookId,
        category: categories,
      })
      .from(bookCategories)
      .innerJoin(categories, eq(bookCategories.categoryId, categories.id))
      .where(sql`${bookCategories.bookId} IN (${sql.join(bookIds.map(id => sql`${id}`), sql`, `)})`);

    // Group by bookId
    const categoriesMap = new Map<string, Category[]>();
    for (const row of results) {
      const category = CategoryMapper.toDomain(row.category);
      const existing = categoriesMap.get(row.bookId) ?? [];
      existing.push(category);
      categoriesMap.set(row.bookId, existing);
    }

    return categoriesMap;
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
