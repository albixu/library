/**
 * CategoryMapper
 *
 * Maps between domain Category entities and database representations.
 * Follows the Data Mapper pattern for clean separation of concerns.
 */

import { Category, type CategoryPersistenceProps } from '../../../../domain/entities/Category.js';
import type { CategorySelect, CategoryInsert } from '../drizzle/schema.js';

/**
 * Maps Category entities to/from database records
 */
export const CategoryMapper = {
  /**
   * Converts a database record to a domain Category entity
   *
   * @param record - The database record from Drizzle
   * @returns Category domain entity
   */
  toDomain(record: CategorySelect): Category {
    const props: CategoryPersistenceProps = {
      id: record.id,
      name: record.name,
      description: record.description,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
    return Category.fromPersistence(props);
  },

  /**
   * Converts a domain Category entity to a database insert record
   *
   * @param category - The domain Category entity
   * @returns Database insert record
   */
  toPersistence(category: Category): CategoryInsert {
    return {
      id: category.id,
      name: category.name,
      description: category.description,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  },

  /**
   * Converts multiple database records to domain entities
   *
   * @param records - Array of database records
   * @returns Array of Category domain entities
   */
  toDomainList(records: CategorySelect[]): Category[] {
    return records.map((record) => CategoryMapper.toDomain(record));
  },

  /**
   * Converts multiple domain entities to database insert records
   *
   * @param categories - Array of Category entities
   * @returns Array of database insert records
   */
  toPersistenceList(categories: Category[]): CategoryInsert[] {
    return categories.map((category) => CategoryMapper.toPersistence(category));
  },
};
