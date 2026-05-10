/**
 * FavoriteRepository Port (Driven/Output Port)
 *
 * Defines the contract for favorite persistence operations.
 * This is a pure domain port — no infrastructure dependencies.
 *
 * HU-039: Favorites domain port for persistence.
 */

import type { Favorite } from '../Favorite.js';
import type { UserId } from '../../user/value-objects/UserId.js';
import type { BookId } from '../../book/value-objects/BookId.js';

/**
 * FavoriteRepository Port Interface
 *
 * Provides operations for managing favorites in the persistence layer.
 */
export interface FavoriteRepository {
  /**
   * Finds a favorite by user and book composite key.
   *
   * @returns Promise resolving to the Favorite if found, null otherwise
   */
  findByUserAndBook(userId: UserId, bookId: BookId): Promise<Favorite | null>;

  /**
   * Persists a new favorite.
   */
  add(favorite: Favorite): Promise<void>;

  /**
   * Removes a favorite by user and book composite key.
   */
  remove(userId: UserId, bookId: BookId): Promise<void>;

  /**
   * Finds all book IDs favorited by a given user.
   *
   * @returns Promise resolving to an array of BookId
   */
  findAllByUser(userId: UserId): Promise<BookId[]>;
}
