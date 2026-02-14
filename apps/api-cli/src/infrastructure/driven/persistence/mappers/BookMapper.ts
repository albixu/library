/**
 * BookMapper
 *
 * Maps between domain Book entities and database representations.
 * Follows the Data Mapper pattern for clean separation of concerns.
 *
 * Note: The Book entity requires Category entities for reconstruction,
 * so the mapper needs to receive categories as an additional parameter
 * when converting from persistence.
 *
 * TRANSITIONAL STATE:
 * The Book entity now uses `authors: Author[]` and `type: BookType` (entity),
 * but the database still uses `author: string` and `type: string`.
 * This mapper handles the conversion between formats until TASK-006 (DB schema)
 * and TASK-009 (full repository update) are completed.
 */

import { Book, type BookPersistenceProps } from '../../../../domain/entities/Book.js';
import { Author } from '../../../../domain/entities/Author.js';
import { BookType } from '../../../../domain/entities/BookType.js';
import type { BookFormat } from '../../../../domain/value-objects/BookFormat.js';
import type { Category } from '../../../../domain/entities/Category.js';
import type { BookSelect, BookInsert } from '../drizzle/schema.js';
import { generateUUID } from '../../../../shared/utils/uuid.js';

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
   * TRANSITIONAL: Creates a single Author entity from the author string column,
   * and a BookType entity from the type string column.
   * This will be updated in TASK-009 when the DB schema supports multiple authors.
   *
   * @param record - The database record from Drizzle
   * @param categories - The associated Category entities
   * @returns Book domain entity
   */
  toDomain(record: BookSelect, categories: Category[]): Book {
    // TRANSITIONAL: Convert single author string to Author entity array
    // In TASK-009, this will read from the authors junction table
    const authorEntity = Author.fromPersistence({
      id: generateUUID(), // Temporary ID until authors table exists
      name: record.author,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });

    // TRANSITIONAL: Convert type string to BookType entity
    // In TASK-009, this will read from the types table via type_id FK
    const bookTypeEntity = BookType.fromPersistence({
      id: generateUUID(), // Temporary ID until types table exists
      name: record.type,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });

    const props: BookPersistenceProps = {
      id: record.id,
      isbn: record.isbn,
      title: record.title,
      authors: [authorEntity],
      description: record.description,
      type: bookTypeEntity,
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
   * TRANSITIONAL: Extracts the first author's name for the author column,
   * and the type name for the type column.
   * This will be updated in TASK-009 when the DB schema supports multiple authors.
   *
   * @param params - The book, embedding, and normalized fields
   * @returns Database insert record
   */
  toPersistence(params: BookToPersistenceParams): BookInsert {
    const { book, embedding, normalizedTitle, normalizedAuthor } = params;

    // TRANSITIONAL: Join all author names for storage in single column
    // In TASK-009, this will insert into the book_authors junction table
    const authorString = book.authors.map(a => a.name).join(', ');

    return {
      id: book.id,
      isbn: book.isbn?.value ?? null,
      title: book.title,
      author: authorString,
      description: book.description,
      type: book.type.name, // BookType entity has .name property
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
