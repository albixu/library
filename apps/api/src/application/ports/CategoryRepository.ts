/**
 * CategoryRepository Port (Driven/Output Port)
 *
 * Defines the contract for category persistence operations.
 * This is a port in the hexagonal architecture - the actual implementation
 * (e.g., PostgresCategoryRepository) will be an adapter in the infrastructure layer.
 *
 * HU-008: Added findByNameAndTypeId and findByTypeId methods for type-scoped queries.
 */

import type { Category } from '../../domain/entities/Category.js';

/**
 * CategoryRepository Port Interface
 *
 * Provides operations for managing categories in the persistence layer.
 * Used by the CreateBook use case to handle category auto-creation.
 */
export interface CategoryRepository {
  /**
   * Finds a category by its unique identifier
   *
   * @param id - The category UUID
   * @returns Promise resolving to the Category if found, null otherwise
   */
  findById(id: string): Promise<Category | null>;

  /**
   * Finds a category by its name (case-insensitive)
   *
   * @param name - The category name to search for
   * @returns Promise resolving to the Category if found, null otherwise
   */
  findByName(name: string): Promise<Category | null>;

  /**
   * Finds a category by its name and type (case-insensitive)
   *
   * HU-008: Categories are now unique within a type, not globally.
   * This method finds a category scoped to a specific type.
   *
   * @param name - The category name to search for
   * @param typeId - The type UUID to scope the search
   * @returns Promise resolving to the Category if found, null otherwise
   */
  findByNameAndTypeId(name: string, typeId: string): Promise<Category | null>;

  /**
   * Finds multiple categories by their names (case-insensitive)
   *
   * @param names - Array of category names to search for
   * @returns Promise resolving to an array of found Categories (may be fewer than input)
   */
  findByNames(names: string[]): Promise<Category[]>;

  /**
   * Finds all categories belonging to a specific type
   *
   * HU-008: Categories now belong to exactly one type.
   *
   * @param typeId - The type UUID to filter by
   * @returns Promise resolving to an array of Categories for the given type
   */
  findByTypeId(typeId: string): Promise<Category[]>;

  /**
   * Finds a category by name or creates it if it doesn't exist
   *
   * HU-008: Now requires typeId since categories are scoped to types.
   *
   * This is an atomic operation - if the category doesn't exist,
   * it will be created with a new UUID.
   *
   * @param name - The category name
   * @param typeId - The type UUID this category belongs to
   * @returns Promise resolving to the existing or newly created Category
   */
  findOrCreate(name: string, typeId: string): Promise<Category>;

  /**
   * Finds or creates multiple categories by their names
   *
   * HU-008: Now requires typeId since categories are scoped to types.
   *
   * This is an atomic operation for batch processing.
   * Categories that don't exist will be created.
   *
   * @param names - Array of category names
   * @param typeId - The type UUID these categories belong to
   * @returns Promise resolving to an array of Categories (same order as input)
   */
  findOrCreateMany(names: string[], typeId: string): Promise<Category[]>;

  /**
   * Saves a new category to the persistence layer
   *
   * @param category - The category to save
   * @returns Promise resolving to the saved Category
   * @throws CategoryAlreadyExistsError if a category with the same name exists for the same type
   */
  save(category: Category): Promise<Category>;

  /**
   * Saves multiple categories to the persistence layer
   *
   * This is a batch operation for persisting multiple categories at once.
   * More efficient than calling save() multiple times.
   * The operation is atomic - either all categories are saved or none are.
   *
   * @param categories - Array of categories to save
   * @returns Promise resolving when all categories are saved
   * @throws CategoryAlreadyExistsError if any category with the same name exists for its type
   */
  saveMany(categories: Category[]): Promise<void>;

  /**
   * Retrieves all categories
   *
   * @returns Promise resolving to an array of all Categories
   */
  findAll(): Promise<Category[]>;

  /**
   * Retrieves all categories sorted alphabetically by name (A-Z)
   *
   * HU-009: Used for listing categories in the API response.
   *
   * @returns Promise resolving to an array of all Categories sorted by name
   */
  findAllSorted(): Promise<Category[]>;

  /**
   * Retrieves categories for a specific type, sorted alphabetically by name (A-Z)
   *
   * HU-009: Used for listing categories filtered by type in the API response.
   *
   * @param typeId - The type UUID to filter by
   * @returns Promise resolving to an array of Categories for the given type, sorted by name
   */
  findByTypeIdSorted(typeId: string): Promise<Category[]>;

  /**
   * Counts the total number of categories
   *
   * @returns Promise resolving to the total count
   */
  count(): Promise<number>;
}
