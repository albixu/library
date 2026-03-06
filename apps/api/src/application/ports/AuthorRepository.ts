/**
 * AuthorRepository Port (Driven/Output Port)
 *
 * Defines the contract for author persistence operations.
 * This is a port in the hexagonal architecture - the actual implementation
 * (e.g., PostgresAuthorRepository) will be an adapter in the infrastructure layer.
 *
 * Authors have a N:M relationship with Books via the book_authors junction table.
 */

import type { Author } from '../../domain/entities/Author.js';

/**
 * AuthorRepository Port Interface
 *
 * Provides operations for managing authors in the persistence layer.
 * Used by the CreateBook use case to handle author auto-creation.
 */
export interface AuthorRepository {
  /**
   * Finds an author by its unique identifier
   *
   * @param id - The author UUID
   * @returns Promise resolving to the Author if found, null otherwise
   */
  findById(id: string): Promise<Author | null>;

  /**
   * Finds an author by its name (case-sensitive exact match)
   *
   * Note: Author names are stored as-is (not normalized) for display purposes,
   * but deduplication should consider case-insensitive matching in findOrCreate.
   *
   * @param name - The author name to search for
   * @returns Promise resolving to the Author if found, null otherwise
   */
  findByName(name: string): Promise<Author | null>;

  /**
   * Finds multiple authors by their names
   *
   * @param names - Array of author names to search for
   * @returns Promise resolving to an array of found Authors (may be fewer than input)
   */
  findByNames(names: string[]): Promise<Author[]>;

  /**
   * Finds an author by name or creates it if it doesn't exist
   *
   * This is an atomic operation - if the author doesn't exist,
   * it will be created with a new UUID.
   *
   * @param name - The author name
   * @returns Promise resolving to the existing or newly created Author
   */
  findOrCreate(name: string): Promise<Author>;

  /**
   * Finds or creates multiple authors by their names
   *
   * This is an atomic operation for batch processing.
   * Authors that don't exist will be created.
   *
   * @param names - Array of author names
   * @returns Promise resolving to an array of Authors (same order as input)
   */
  findOrCreateMany(names: string[]): Promise<Author[]>;

  /**
   * Saves a new author to the persistence layer
   *
   * @param author - The author to save
   * @returns Promise resolving to the saved Author
   * @throws AuthorAlreadyExistsError if an author with the same name exists
   */
  save(author: Author): Promise<Author>;

  /**
   * Retrieves all authors
   *
   * @returns Promise resolving to an array of all Authors
   */
  findAll(): Promise<Author[]>;

  /**
   * Counts the total number of authors
   *
   * @returns Promise resolving to the total count
   */
  count(): Promise<number>;
}
