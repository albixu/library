/**
 * AuthorMapper
 *
 * Maps between domain Author entities and database representations.
 * Follows the Data Mapper pattern for clean separation of concerns.
 */

import { Author, type AuthorPersistenceProps } from '../../../../domain/entities/Author.js';
import type { AuthorSelect, AuthorInsert } from '../drizzle/schema.js';

/**
 * Maps Author entities to/from database records
 */
export const AuthorMapper = {
  /**
   * Converts a database record to a domain Author entity
   *
   * @param record - The database record from Drizzle
   * @returns Author domain entity
   */
  toDomain(record: AuthorSelect): Author {
    const props: AuthorPersistenceProps = {
      id: record.id,
      name: record.name,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
    return Author.fromPersistence(props);
  },

  /**
   * Converts a domain Author entity to a database insert record
   *
   * @param author - The domain Author entity
   * @returns Database insert record
   */
  toPersistence(author: Author): AuthorInsert {
    return {
      id: author.id,
      name: author.name,
      createdAt: author.createdAt,
      updatedAt: author.updatedAt,
    };
  },

  /**
   * Converts multiple database records to domain entities
   *
   * @param records - Array of database records
   * @returns Array of Author domain entities
   */
  toDomainList(records: AuthorSelect[]): Author[] {
    return records.map((record) => AuthorMapper.toDomain(record));
  },

  /**
   * Converts multiple domain entities to database insert records
   *
   * @param authors - Array of Author entities
   * @returns Array of database insert records
   */
  toPersistenceList(authors: Author[]): AuthorInsert[] {
    return authors.map((author) => AuthorMapper.toPersistence(author));
  },
};
