/**
 * BookMapper
 *
 * Maps between domain Book entities and database representations.
 * Follows the Data Mapper pattern for clean separation of concerns.
 *
 * The Book entity requires Author, BookType, and Category entities for reconstruction,
 * so the mapper needs to receive these as additional parameters when converting
 * from persistence.
 *
 * HU-002 CHANGES:
 * - Book now uses `authors: Author[]` (N:M via book_authors table)
 * - Book now uses `type: BookType` entity (N:1 via type_id FK)
 * - Database schema uses type_id instead of type string
 * - author/normalized_author columns removed from books table
 */

import { Book, type BookPersistenceProps } from '../../../../domain/entities/Book.js';
import type { Author } from '../../../../domain/entities/Author.js';
import type { BookType } from '../../../../domain/entities/BookType.js';
import type { BookFormat } from '../../../../domain/value-objects/BookFormat.js';
import type { Category } from '../../../../domain/entities/Category.js';
import type { BookSelect, BookInsert } from '../drizzle/schema.js';

/**
 * Extended book record that includes related entities
 * Used when fetching books with their relations
 */
export interface BookWithRelations extends BookSelect {
  authors: Author[];
  type: BookType;
  categories: Category[];
}

/**
 * Parameters for converting a Book to persistence format
 */
export interface BookToPersistenceParams {
  book: Book;
  embedding: number[];
  normalizedTitle: string;
}

/**
 * Maps Book entities to/from database records
 */
export const BookMapper = {
  /**
   * Converts a database record to a domain Book entity
   *
   * @param record - The database record from Drizzle
   * @param authors - The associated Author entities (from book_authors)
   * @param type - The associated BookType entity (from types via type_id)
   * @param categories - The associated Category entities (from book_categories)
   * @returns Book domain entity
   */
  toDomain(
    record: BookSelect,
    authors: Author[],
    type: BookType,
    categories: Category[]
  ): Book {
    const props: BookPersistenceProps = {
      id: record.id,
      isbn: record.isbn,
      title: record.title,
      authors: authors,
      description: record.description,
      type: type,
      format: record.format as BookFormat['value'],
      categories: categories,
      available: record.available,
      path: record.path,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
    return Book.fromPersistence(props);
  },

  /**
   * Converts a domain Book entity to a database insert record
   *
   * Note: This only returns the books table record.
   * The book_authors and book_categories relations must be inserted separately.
   *
   * @param params - The book, embedding, and normalized title
   * @returns Database insert record for books table
   */
  toPersistence(params: BookToPersistenceParams): BookInsert {
    const { book, embedding, normalizedTitle } = params;

    return {
      id: book.id,
      isbn: book.isbn?.value ?? null,
      title: book.title,
      description: book.description,
      typeId: book.type.id, // FK to types table
      format: book.format.value,
      available: book.available,
      path: book.path,
      embedding: embedding,
      normalizedTitle: normalizedTitle,
      createdAt: book.createdAt,
      updatedAt: book.updatedAt,
    };
  },

  /**
   * Converts multiple database records with relations to domain entities
   *
   * @param records - Array of database records with their relations
   * @returns Array of Book domain entities
   */
  toDomainList(records: BookWithRelations[]): Book[] {
    return records.map((record) =>
      BookMapper.toDomain(record, record.authors, record.type, record.categories)
    );
  },
};
