/**
 * LevelMapper
 *
 * Maps between domain Level entities and database representations.
 * Follows the Data Mapper pattern for clean separation of concerns.
 *
 * HU-008: Part of the dynamic levels implementation.
 */

import { Level, type LevelPersistenceProps } from '../../../../domain/entities/Level.js';
import type { LevelSelect, LevelInsert } from '../drizzle/schema.js';

/**
 * Maps Level entities to/from database records
 */
export const LevelMapper = {
  /**
   * Converts a database record to a domain Level entity
   *
   * @param record - The database record from Drizzle
   * @returns Level domain entity
   */
  toDomain(record: LevelSelect): Level {
    const props: LevelPersistenceProps = {
      id: record.id,
      name: record.name,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
    return Level.fromPersistence(props);
  },

  /**
   * Converts a domain Level entity to a database insert record
   *
   * @param level - The domain Level entity
   * @returns Database insert record
   */
  toPersistence(level: Level): LevelInsert {
    return {
      id: level.id,
      name: level.name,
      createdAt: level.createdAt,
      updatedAt: level.updatedAt,
    };
  },

  /**
   * Converts multiple database records to domain entities
   *
   * @param records - Array of database records
   * @returns Array of Level domain entities
   */
  toDomainList(records: LevelSelect[]): Level[] {
    return records.map((record) => LevelMapper.toDomain(record));
  },

  /**
   * Converts multiple domain entities to database insert records
   *
   * @param levels - Array of Level entities
   * @returns Array of database insert records
   */
  toPersistenceList(levels: Level[]): LevelInsert[] {
    return levels.map((level) => LevelMapper.toPersistence(level));
  },
};
