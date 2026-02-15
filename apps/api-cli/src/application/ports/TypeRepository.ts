/**
 * TypeRepository Port (Driven/Output Port)
 *
 * Defines the contract for book type persistence operations.
 * This is a port in the hexagonal architecture - the actual implementation
 * (e.g., PostgresTypeRepository) will be an adapter in the infrastructure layer.
 *
 * NOTE: Types are read-only in the application layer. They are seeded at database
 * initialization and should not be created/updated through the application.
 * This is why there is no save(), update(), or findOrCreate() methods.
 */

import type { BookType } from '../../domain/entities/BookType.js';

/**
 * TypeRepository Port Interface
 *
 * Provides read-only operations for managing book types in the persistence layer.
 * Used by the CreateBook use case to validate and retrieve type references.
 */
export interface TypeRepository {
  /**
   * Finds a book type by its unique identifier
   *
   * @param id - The type UUID
   * @returns Promise resolving to the BookType if found, null otherwise
   */
  findById(id: string): Promise<BookType | null>;

  /**
   * Finds a book type by its name (case-insensitive)
   *
   * Note: Type names are stored in lowercase. The search is case-insensitive
   * to provide a better user experience.
   *
   * @param name - The type name to search for (e.g., "technical", "novel")
   * @returns Promise resolving to the BookType if found, null otherwise
   */
  findByName(name: string): Promise<BookType | null>;

  /**
   * Retrieves all book types
   *
   * @returns Promise resolving to an array of all BookTypes
   */
  findAll(): Promise<BookType[]>;

  /**
   * Counts the total number of book types
   *
   * @returns Promise resolving to the total count
   */
  count(): Promise<number>;
}
