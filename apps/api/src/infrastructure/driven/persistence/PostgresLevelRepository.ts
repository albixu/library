/**
 * PostgresLevelRepository
 *
 * PostgreSQL implementation of the LevelRepository port using Drizzle ORM.
 *
 * HU-008: Implements persistence for dynamic Level entities and their
 * relationship with Types through the type_levels junction table.
 */

import { count, eq, asc } from 'drizzle-orm';
import type { LevelRepository } from '../../../application/ports/LevelRepository.js';
import type { Level } from '../../../domain/entities/Level.js';
import { levels, typeLevels } from './drizzle/schema.js';
import { LevelMapper } from './mappers/LevelMapper.js';
import type { DatabaseClient } from './types.js';

/**
 * PostgreSQL implementation of LevelRepository
 */
export class PostgresLevelRepository implements LevelRepository {
  constructor(public readonly db: DatabaseClient) {}

  /**
   * Finds a level by its unique identifier
   *
   * @param id - The level UUID
   * @returns Promise resolving to the Level if found, null otherwise
   */
  async findById(id: string): Promise<Level | null> {
    const result = await this.db.query.levels.findFirst({
      where: (levels, { eq }) => eq(levels.id, id),
    });

    if (!result) {
      return null;
    }

    return LevelMapper.toDomain(result);
  }

  /**
   * Finds a level by its name (case-insensitive)
   *
   * Level names are stored as provided but compared case-insensitively.
   *
   * @param name - The level name to search for
   * @returns Promise resolving to the Level if found, null otherwise
   */
  async findByName(name: string): Promise<Level | null> {
    const trimmedName = name.trim();

    // Early return for empty names
    if (!trimmedName) {
      return null;
    }

    // Normalize to lowercase for case-insensitive search
    const normalizedName = trimmedName.toLowerCase();

    const result = await this.db.query.levels.findFirst({
      where: (levels, { sql }) => sql`LOWER(${levels.name}) = ${normalizedName}`,
    });

    if (!result) {
      return null;
    }

    return LevelMapper.toDomain(result);
  }

  /**
   * Persists a new level to the database
   *
   * @param level - The Level entity to save
   * @returns Promise resolving when the operation completes
   * @throws Error if a level with the same name already exists (unique constraint)
   */
  async save(level: Level): Promise<void> {
    const record = LevelMapper.toPersistence(level);
    await this.db.insert(levels).values(record);
  }

  /**
   * Checks if a level is associated with a specific book type
   *
   * Queries the type_levels junction table to validate the relationship.
   *
   * @param levelId - The level UUID to check
   * @param typeId - The type UUID to check against
   * @returns Promise resolving to true if the association exists, false otherwise
   */
  async existsForType(levelId: string, typeId: string): Promise<boolean> {
    const result = await this.db.query.typeLevels.findFirst({
      where: (tl, { and, eq }) => and(
        eq(tl.levelId, levelId),
        eq(tl.typeId, typeId),
      ),
    });

    return result !== undefined && result !== null;
  }

  /**
   * Associates a level with a book type
   *
   * Creates an entry in the type_levels join table.
   * Uses ON CONFLICT DO NOTHING for idempotent behavior.
   *
   * @param levelId - The level UUID to associate
   * @param typeId - The type UUID to associate with
   * @returns Promise resolving when the operation completes
   */
  async addToType(levelId: string, typeId: string): Promise<void> {
    await this.db
      .insert(typeLevels)
      .values({
        levelId,
        typeId,
        createdAt: new Date(),
      })
      .onConflictDoNothing();
  }

  /**
   * Retrieves all levels
   *
   * @returns Promise resolving to an array of all Levels
   */
  async findAll(): Promise<Level[]> {
    const results = await this.db.query.levels.findMany();
    return LevelMapper.toDomainList(results);
  }

  /**
   * Retrieves all levels associated with a specific book type
   *
   * Performs a join through the type_levels junction table.
   *
   * @param typeId - The type UUID to filter by
   * @returns Promise resolving to an array of Levels for the given type
   */
  async findByTypeId(typeId: string): Promise<Level[]> {
    const results = await this.db
      .select({
        id: levels.id,
        name: levels.name,
        createdAt: levels.createdAt,
        updatedAt: levels.updatedAt,
      })
      .from(levels)
      .innerJoin(typeLevels, eq(levels.id, typeLevels.levelId))
      .where(eq(typeLevels.typeId, typeId));

    return LevelMapper.toDomainList(results);
  }

  /**
   * Counts the total number of levels
   *
   * @returns Promise resolving to the total count
   */
  async count(): Promise<number> {
    const result = await this.db.select({ count: count() }).from(levels);
    return Number(result[0]?.count ?? 0);
  }

  /**
   * Retrieves all levels sorted alphabetically by name (A-Z)
   *
   * Used by list endpoints to return levels in a consistent order.
   *
   * @returns Promise resolving to an array of all Levels sorted by name
   */
  async findAllSorted(): Promise<Level[]> {
    const results = await this.db
      .select()
      .from(levels)
      .orderBy(asc(levels.name));

    return LevelMapper.toDomainList(results);
  }

  /**
   * Retrieves levels associated with a type, sorted alphabetically by name (A-Z)
   *
   * Uses the type_levels junction table to find associated levels.
   * Used by list endpoints to return filtered levels in a consistent order.
   *
   * @param typeId - The type UUID to filter by
   * @returns Promise resolving to an array of Levels for the given type, sorted by name
   */
  async findByTypeIdSorted(typeId: string): Promise<Level[]> {
    const results = await this.db
      .select({
        id: levels.id,
        name: levels.name,
        createdAt: levels.createdAt,
        updatedAt: levels.updatedAt,
      })
      .from(levels)
      .innerJoin(typeLevels, eq(levels.id, typeLevels.levelId))
      .where(eq(typeLevels.typeId, typeId))
      .orderBy(asc(levels.name));

    return LevelMapper.toDomainList(results);
  }
}
