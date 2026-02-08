/**
 * CategoryRepository Port (Driven/Output Port)
 *
 * Defines the contract for category persistence operations.
 * This is a port in the hexagonal architecture - the actual implementation
 * (e.g., PostgresCategoryRepository) will be an adapter in the infrastructure layer.
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
   * Finds multiple categories by their names (case-insensitive)
   *
   * @param names - Array of category names to search for
   * @returns Promise resolving to an array of found Categories (may be fewer than input)
   */
  findByNames(names: string[]): Promise<Category[]>;

  /**
   * Finds a category by name or creates it if it doesn't exist
   *
   * This is an atomic operation - if the category doesn't exist,
   * it will be created with a new UUID.
   *
   * @param name - The category name
   * @returns Promise resolving to the existing or newly created Category
   */
  findOrCreate(name: string): Promise<Category>;

  /**
   * Finds or creates multiple categories by their names
   *
   * This is an atomic operation for batch processing.
   * Categories that don't exist will be created.
   *
   * @param names - Array of category names
   * @returns Promise resolving to an array of Categories (same order as input)
   */
  findOrCreateMany(names: string[]): Promise<Category[]>;

  /**
   * Saves a new category to the persistence layer
   *
   * @param category - The category to save
   * @returns Promise resolving to the saved Category
   * @throws CategoryAlreadyExistsError if a category with the same name exists
   */
  save(category: Category): Promise<Category>;

  /**
   * Retrieves all categories
   *
   * @returns Promise resolving to an array of all Categories
   */
  findAll(): Promise<Category[]>;
}
