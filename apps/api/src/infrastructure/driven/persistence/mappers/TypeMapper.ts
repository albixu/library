/**
 * TypeMapper
 *
 * Maps between domain BookType entities and database representations.
 * Follows the Data Mapper pattern for clean separation of concerns.
 *
 * HU-008: Updated to support levelIds (N:N relationship with levels table).
 * The levelIds are loaded separately from the type_levels junction table
 * and must be provided to toDomain methods.
 */

import { BookType, type BookTypePersistenceProps } from '../../../../domain/entities/BookType.js';
import type { TypeSelect, TypeInsert } from '../drizzle/schema.js';

/**
 * Extended type record that includes levelIds from the junction table
 * The repository is responsible for joining and providing this data.
 */
export interface TypeSelectWithLevels extends TypeSelect {
  levelIds: readonly string[];
}

/**
 * Maps BookType entities to/from database records
 */
export const TypeMapper = {
  /**
   * Converts a database record to a domain BookType entity
   *
   * HU-008: Now requires levelIds to be provided (loaded from type_levels table)
   *
   * @param record - The database record from Drizzle with levelIds
   * @returns BookType domain entity
   */
  toDomain(record: TypeSelectWithLevels): BookType {
    const props: BookTypePersistenceProps = {
      id: record.id,
      name: record.name,
      levelIds: record.levelIds,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
    return BookType.fromPersistence(props);
  },

  /**
   * Converts a domain BookType entity to a database insert record
   *
   * Note: This only returns the types table record.
   * The type_levels junction records must be handled separately.
   *
   * @param type - The domain BookType entity
   * @returns Database insert record for types table
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
   * Extracts type-level junction records from a BookType entity
   *
   * HU-008: Used to populate the type_levels junction table
   *
   * @param type - The domain BookType entity
   * @returns Array of type_levels junction records
   */
  toLevelJunctionRecords(type: BookType): { typeId: string; levelId: string }[] {
    return type.levelIds.map((levelId) => ({
      typeId: type.id,
      levelId,
    }));
  },

  /**
   * Converts multiple database records to domain entities
   *
   * @param records - Array of database records with levelIds
   * @returns Array of BookType domain entities
   */
  toDomainList(records: TypeSelectWithLevels[]): BookType[] {
    return records.map((record) => TypeMapper.toDomain(record));
  },

  /**
   * Converts multiple domain entities to database insert records
   *
   * @param types - Array of BookType entities
   * @returns Array of database insert records for types table
   */
  toPersistenceList(types: BookType[]): TypeInsert[] {
    return types.map((type) => TypeMapper.toPersistence(type));
  },
};
