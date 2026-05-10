/**
 * UserRepository Port (Driven/Output Port)
 *
 * Defines the contract for user persistence operations.
 * This is a pure domain port — no infrastructure dependencies.
 *
 * HU-038: Authentication domain port for user lookup and persistence.
 */

import type { User } from '../User.js';

/**
 * UserRepository Port Interface
 *
 * Provides operations for managing users in the persistence layer.
 */
export interface UserRepository {
  /**
   * Finds a user by their email address
   *
   * @param email - The email address to search for
   * @returns Promise resolving to the User if found, null otherwise
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Finds a user by their unique identifier
   *
   * @param id - The user UUID
   * @returns Promise resolving to the User if found, null otherwise
   */
  findById(id: string): Promise<User | null>;

  /**
   * Persists a new user
   *
   * @param user - The User entity to save
   */
  save(user: User): Promise<void>;

  /**
   * Updates only the password hash for a given user
   *
   * @param userId - The user UUID
   * @param passwordHash - The new bcrypt password hash
   */
  updatePassword(userId: string, passwordHash: string): Promise<void>;
}
