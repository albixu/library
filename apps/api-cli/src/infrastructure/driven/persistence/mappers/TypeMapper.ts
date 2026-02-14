/**
 * TypeMapper
 *
 * Maps between domain BookType entities and database representations.
 * Follows the Data Mapper pattern for clean separation of concerns.
 */

import { BookType, type BookTypePersistenceProps } from '../../../../domain/entities/BookType.js';
import type { TypeSelect, TypeInsert } from '../drizzle/schema.js';

/**
 * Maps BookType entities to/from database records
 */
export const TypeMapper = {
  /**
   * Converts a database record to a domain BookType entity
   *
   * @param record - The database record from Drizzle
   * @returns BookType domain entity
   */
  toDomain(record: TypeSelect): BookType {
    const props: BookTypePersistenceProps = {
      id: record.id,
      name: record.name,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
    return BookType.fromPersistence(props);
  },

  /**
   * Converts a domain BookType entity to a database insert record
   *
   * @param type - The domain BookType entity
   * @returns Database insert record
   */
  toPersistence(type: BookType): TypeInsert {
    return {
      id: type.id,
      name: type.name,
      createdAt: type.createdAt,
      updatedAt: type.updatedAt,
    };
  },

  /**
   * Converts multiple database records to domain entities
   *
   * @param records - Array of database records
   * @returns Array of BookType domain entities
   */
  toDomainList(records: TypeSelect[]): BookType[] {
    return records.map((record) => TypeMapper.toDomain(record));
  },
};
