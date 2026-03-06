/**
 * PostgresTypeRepository
 *
 * PostgreSQL implementation of the TypeRepository port using Drizzle ORM.
 *
 * This repository provides read-only access to book types stored in the database.
 * Types are seeded at database initialization and should not be created/updated
 * through the application layer.
 *
 * HU-008: Updated to load levelIds from type_levels junction table.
 * Each BookType now includes its associated Level UUIDs.
 *
 * Part of TASK-008 for HU-002 (Initial Data Load)
 */

import { count, asc, eq, inArray } from 'drizzle-orm';
import type { TypeRepository } from '../../../application/ports/TypeRepository.js';
import type { BookType } from '../../../domain/entities/BookType.js';
import { types, typeLevels } from './drizzle/schema.js';
import type { TypeSelect } from './drizzle/schema.js';
import { TypeMapper, type TypeSelectWithLevels } from './mappers/TypeMapper.js';
import type { DatabaseClient } from './types.js';

/**
 * PostgreSQL implementation of TypeRepository
 */
export class PostgresTypeRepository implements TypeRepository {
  constructor(public readonly db: DatabaseClient) {}

  /**
   * Loads levelIds for a single type from the type_levels junction table
   */
  private async loadLevelIdsForType(typeId: string): Promise<string[]> {
    const results = await this.db.query.typeLevels.findMany({
      where: eq(typeLevels.typeId, typeId),
    });
    return results.map((r) => r.levelId);
  }

  /**
   * Loads levelIds for multiple types from the type_levels junction table
   * Returns a map of typeId -> levelIds[]
   */
  private async loadLevelIdsForTypes(typeIds: string[]): Promise<Map<string, string[]>> {
    if (typeIds.length === 0) {
      return new Map();
    }

    const results = await this.db.query.typeLevels.findMany({
      where: inArray(typeLevels.typeId, typeIds),
    });

    const levelIdsByType = new Map<string, string[]>();
    
    // Initialize all typeIds with empty arrays
    for (const typeId of typeIds) {
      levelIdsByType.set(typeId, []);
    }

    // Populate with actual level IDs
    for (const record of results) {
      const levels = levelIdsByType.get(record.typeId) ?? [];
      levels.push(record.levelId);
      levelIdsByType.set(record.typeId, levels);
    }

    return levelIdsByType;
  }

  /**
   * Combines a type record with its levelIds to create a TypeSelectWithLevels
   */
  private combineWithLevelIds(
    record: TypeSelect,
    levelIds: readonly string[],
  ): TypeSelectWithLevels {
    return {
      ...record,
      levelIds,
    };
  }

  /**
   * Finds a book type by its unique identifier
   *
   * @param id - The type UUID
   * @returns Promise resolving to the BookType if found, null otherwise
   */
  async findById(id: string): Promise<BookType | null> {
    const result = await this.db.query.types.findFirst({
      where: (types, { eq }) => eq(types.id, id),
    });

    if (!result) {
      return null;
    }

    const levelIds = await this.loadLevelIdsForType(result.id);
    return TypeMapper.toDomain(this.combineWithLevelIds(result, levelIds));
  }

  /**
   * Finds a book type by its name (case-insensitive)
   *
   * Type names are stored in lowercase, so we normalize the input
   * for case-insensitive matching.
   *
   * @param name - The type name to search for
   * @returns Promise resolving to the BookType if found, null otherwise
   */
  async findByName(name: string): Promise<BookType | null> {
    const trimmedName = name.trim();

    // Early return for empty names
    if (!trimmedName) {
      return null;
    }

    // Normalize to lowercase for case-insensitive search
    const normalizedName = trimmedName.toLowerCase();

    const result = await this.db.query.types.findFirst({
      where: (types, { eq }) => eq(types.name, normalizedName),
    });

    if (!result) {
      return null;
    }

    const levelIds = await this.loadLevelIdsForType(result.id);
    return TypeMapper.toDomain(this.combineWithLevelIds(result, levelIds));
  }

  /**
   * Retrieves all book types
   *
   * @returns Promise resolving to an array of all BookTypes
   */
  async findAll(): Promise<BookType[]> {
    const results = await this.db.query.types.findMany();
    
    if (results.length === 0) {
      return [];
    }

    const levelIdsByType = await this.loadLevelIdsForTypes(results.map((t) => t.id));
    
    const recordsWithLevels: TypeSelectWithLevels[] = results.map((record) =>
      this.combineWithLevelIds(record, levelIdsByType.get(record.id) ?? []),
    );

    return TypeMapper.toDomainList(recordsWithLevels);
  }

  /**
   * Retrieves all book types sorted alphabetically by name
   *
   * @returns Promise resolving to an array of BookTypes sorted by name (A-Z)
   */
  async findAllSorted(): Promise<BookType[]> {
    const results = await this.db.query.types.findMany({
      orderBy: (types) => asc(types.name),
    });

    if (results.length === 0) {
      return [];
    }

    const levelIdsByType = await this.loadLevelIdsForTypes(results.map((t) => t.id));
    
    const recordsWithLevels: TypeSelectWithLevels[] = results.map((record) =>
      this.combineWithLevelIds(record, levelIdsByType.get(record.id) ?? []),
    );

    return TypeMapper.toDomainList(recordsWithLevels);
  }

  /**
   * Counts the total number of book types
   *
   * @returns Promise resolving to the total count
   */
  async count(): Promise<number> {
    const result = await this.db.select({ count: count() }).from(types);
    return Number(result[0]?.count ?? 0);
  }
}
