/**
 * BookMapper
 *
 * Maps between domain Book entities and database representations.
 * Follows the Data Mapper pattern for clean separation of concerns.
 *
 * Note: The Book entity requires Category entities for reconstruction,
 * so the mapper needs to receive categories as an additional parameter
 * when converting from persistence.
 */

import { Book, type BookPersistenceProps } from '../../../../domain/entities/Book.js';
import type { BookType } from '../../../../domain/value-objects/BookType.js';
import type { BookFormat } from '../../../../domain/value-objects/BookFormat.js';
import type { Category } from '../../../../domain/entities/Category.js';
import type { BookSelect, BookInsert } from '../drizzle/schema.js';

/**
 * Extended book record that includes categories
 * Used when fetching books with their related categories
 */
export interface BookWithCategories extends BookSelect {
  categories: Category[];
}

/**
 * Parameters for converting a Book to persistence format
 */
export interface BookToPersistenceParams {
  book: Book;
  embedding: number[];
  normalizedTitle: string;
  normalizedAuthor: string;
}

/**
 * Maps Book entities to/from database records
 */
export const BookMapper = {
  /**
   * Converts a database record to a domain Book entity
   *
   * @param record - The database record from Drizzle
   * @param categories - The associated Category entities
   * @returns Book domain entity
   */
  toDomain(record: BookSelect, categories: Category[]): Book {
    const props: BookPersistenceProps = {
      id: record.id,
      isbn: record.isbn,
      title: record.title,
      author: record.author,
      description: record.description,
      type: record.type as BookType['value'],
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
   * @param params - The book, embedding, and normalized fields
   * @returns Database insert record
   */
  toPersistence(params: BookToPersistenceParams): BookInsert {
    const { book, embedding, normalizedTitle, normalizedAuthor } = params;

    return {
      id: book.id,
      isbn: book.isbn?.value ?? null,
      title: book.title,
      author: book.author,
      description: book.description,
      type: book.type.value,
      format: book.format.value,
      available: book.available,
      path: book.path,
      embedding: embedding,
      normalizedTitle: normalizedTitle,
      normalizedAuthor: normalizedAuthor,
      createdAt: book.createdAt,
      updatedAt: book.updatedAt,
    };
  },

  /**
   * Converts multiple database records to domain entities
   *
   * @param records - Array of database records with their categories
   * @returns Array of Book domain entities
   */
  toDomainList(records: BookWithCategories[]): Book[] {
    return records.map((record) => BookMapper.toDomain(record, record.categories));
  },
};
