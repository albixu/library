/**
 * Download Entity
 *
 * Represents a book download event for a user.
 *
 * Entities are:
 * - Identified by the composite (userId, bookId)
 * - Immutable (all state is set at construction time)
 * - Responsible for maintaining their own invariants
 *
 * HU-039: Downloads domain entity.
 */

import { UserId } from '../user/value-objects/UserId.js';
import { BookId } from '../book/value-objects/BookId.js';

export interface DownloadPersistenceProps {
  userId: string;
  bookId: string;
  downloadedAt: Date;
}

export class Download {
  private constructor(
    public readonly userId: UserId,
    public readonly bookId: BookId,
    public readonly downloadedAt: Date,
  ) {
    Object.freeze(this);
  }

  /**
   * Creates a new Download with current timestamp.
   * Use this when a user downloads a book.
   */
  static create(userId: UserId, bookId: BookId): Download {
    return new Download(userId, bookId, new Date());
  }

  /**
   * Reconstructs a Download from persistence data without re-validation.
   * Use this when loading a download record from the database.
   */
  static fromPersistence(props: DownloadPersistenceProps): Download {
    const userId = UserId.fromPersistence(props.userId);
    const bookId = BookId.fromPersistence(props.bookId);
    return new Download(userId, bookId, props.downloadedAt);
  }

  /**
   * Compares two Download instances by their composite key.
   */
  equals(other: Download): boolean {
    return this.userId.equals(other.userId) && this.bookId.equals(other.bookId);
  }
}
