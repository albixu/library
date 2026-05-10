/**
 * Favorite Entity
 *
 * Represents a book marked as favorite by a user.
 *
 * Entities are:
 * - Identified by the composite (userId, bookId)
 * - Immutable (all state is set at construction time)
 * - Responsible for maintaining their own invariants
 *
 * HU-039: Favorites domain entity.
 */

import { UserId } from '../user/value-objects/UserId.js';
import { BookId } from '../book/value-objects/BookId.js';

export interface FavoritePersistenceProps {
  userId: string;
  bookId: string;
  createdAt: Date;
}

export class Favorite {
  private constructor(
    public readonly userId: UserId,
    public readonly bookId: BookId,
    public readonly createdAt: Date,
  ) {
    Object.freeze(this);
  }

  /**
   * Creates a new Favorite with current timestamp.
   * Use this when a user marks a book as favorite.
   */
  static create(userId: UserId, bookId: BookId): Favorite {
    return new Favorite(userId, bookId, new Date());
  }

  /**
   * Reconstructs a Favorite from persistence data without re-validation.
   * Use this when loading a favorite from the database.
   */
  static fromPersistence(props: FavoritePersistenceProps): Favorite {
    const userId = UserId.fromPersistence(props.userId);
    const bookId = BookId.fromPersistence(props.bookId);
    return new Favorite(userId, bookId, props.createdAt);
  }

  /**
   * Compares two Favorite instances by their composite key.
   */
  equals(other: Favorite): boolean {
    return this.userId.equals(other.userId) && this.bookId.equals(other.bookId);
  }
}
