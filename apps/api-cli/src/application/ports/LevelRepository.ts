/**
 * LevelRepository Port (Driven/Output Port)
 *
 * Defines the contract for level persistence operations.
 * This is a port in the hexagonal architecture - the actual implementation
 * (e.g., PostgresLevelRepository) will be an adapter in the infrastructure layer.
 *
 * HU-008: Levels are now dynamic entities (replacing the BookLevel enum).
 * They can be created on-demand when processing books and are associated
 * with types through the type_levels join table.
 */

import type { Level } from '../../domain/entities/Level.js';

/**
 * LevelRepository Port Interface
 *
 * Provides operations for managing levels in the persistence layer.
 * Used by the CreateBook use case to validate, retrieve, and create level references.
 */
export interface LevelRepository {
  /**
   * Finds a level by its unique identifier
   *
   * @param id - The level UUID
   * @returns Promise resolving to the Level if found, null otherwise
   */
  findById(id: string): Promise<Level | null>;

  /**
   * Finds a level by its name (case-insensitive)
   *
   * Note: Level names are stored in lowercase. The search is case-insensitive
   * to provide a better user experience.
   *
   * @param name - The level name to search for (e.g., "beginner", "advanced")
   * @returns Promise resolving to the Level if found, null otherwise
   */
  findByName(name: string): Promise<Level | null>;

  /**
   * Persists a new level to the database
   *
   * @param level - The Level entity to save
   * @returns Promise resolving when the operation completes
   * @throws Error if a level with the same name already exists
   */
  save(level: Level): Promise<void>;

  /**
   * Checks if a level is associated with a specific book type
   *
   * This validates the type_levels relationship to ensure the level
   * is valid for the given book type.
   *
   * @param levelId - The level UUID to check
   * @param typeId - The type UUID to check against
   * @returns Promise resolving to true if the association exists, false otherwise
   */
  existsForType(levelId: string, typeId: string): Promise<boolean>;

  /**
   * Associates a level with a book type
   *
   * Creates an entry in the type_levels join table.
   * This operation is idempotent - calling it multiple times with the same
   * parameters will not create duplicate associations.
   *
   * @param levelId - The level UUID to associate
   * @param typeId - The type UUID to associate with
   * @returns Promise resolving when the operation completes
   */
  addToType(levelId: string, typeId: string): Promise<void>;

  /**
   * Retrieves all levels
   *
   * @returns Promise resolving to an array of all Levels
   */
  findAll(): Promise<Level[]>;

  /**
   * Retrieves all levels associated with a specific book type
   *
   * @param typeId - The type UUID to filter by
   * @returns Promise resolving to an array of Levels for the given type
   */
  findByTypeId(typeId: string): Promise<Level[]>;

  /**
   * Counts the total number of levels
   *
   * @returns Promise resolving to the total count
   */
  count(): Promise<number>;
}
