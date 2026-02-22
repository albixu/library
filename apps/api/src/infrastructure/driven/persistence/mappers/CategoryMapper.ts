/**
 * CategoryMapper
 *
 * Maps between domain Category entities and database representations.
 * Follows the Data Mapper pattern for clean separation of concerns.
 *
 * HU-008: Updated to include typeId field for type-category relationship.
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
      typeId: record.typeId, // HU-008: Include typeId
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
      typeId: category.typeId, // HU-008: Include typeId
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
