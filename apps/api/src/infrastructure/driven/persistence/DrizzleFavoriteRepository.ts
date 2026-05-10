/**
 * DrizzleFavoriteRepository Adapter
 *
 * Implements the FavoriteRepository port using Drizzle ORM with PostgreSQL.
 * This is a driven/output adapter in the hexagonal architecture.
 *
 * HU-039: Persistence adapter for Favorite entity.
 */

import { eq, and } from 'drizzle-orm';
import type { FavoriteRepository } from '../../../domain/favorite/ports/FavoriteRepository.js';
import { Favorite } from '../../../domain/favorite/Favorite.js';
import type { UserId } from '../../../domain/user/value-objects/UserId.js';
import type { BookId } from '../../../domain/book/value-objects/BookId.js';
import { BookId as BookIdVO } from '../../../domain/book/value-objects/BookId.js';
import { userBookFavorites, type UserBookFavoriteSelect } from './drizzle/schema.js';
import type { DatabaseClient } from './types.js';

/**
 * Maps a Drizzle UserBookFavoriteSelect row to a Favorite domain entity
 */
function toDomain(row: UserBookFavoriteSelect): Favorite {
  return Favorite.fromPersistence({
    userId: row.userId,
    bookId: row.bookId,
    createdAt: row.createdAt ?? new Date(),
  });
}

/**
 * DrizzleFavoriteRepository
 *
 * Adapter that implements FavoriteRepository using Drizzle ORM.
 */
export class DrizzleFavoriteRepository implements FavoriteRepository {
  constructor(private readonly db: DatabaseClient) {}

  /**
   * Finds a favorite by composite key (userId, bookId)
   */
  async findByUserAndBook(userId: UserId, bookId: BookId): Promise<Favorite | null> {
    const row = await this.db.query.userBookFavorites.findFirst({
      where: and(
        eq(userBookFavorites.userId, userId.value),
        eq(userBookFavorites.bookId, bookId.value),
      ),
    });

    return row ? toDomain(row) : null;
  }

  /**
   * Persists a new favorite record
   */
  async add(favorite: Favorite): Promise<void> {
    await this.db.insert(userBookFavorites).values({
      userId: favorite.userId.value,
      bookId: favorite.bookId.value,
      createdAt: favorite.createdAt,
    });
  }

  /**
   * Removes a favorite by composite key (userId, bookId)
   */
  async remove(userId: UserId, bookId: BookId): Promise<void> {
    await this.db
      .delete(userBookFavorites)
      .where(
        and(
          eq(userBookFavorites.userId, userId.value),
          eq(userBookFavorites.bookId, bookId.value),
        ),
      );
  }

  /**
   * Finds all bookIds favorited by a given user
   */
  async findAllByUser(userId: UserId): Promise<BookId[]> {
    const rows = await this.db.query.userBookFavorites.findMany({
      where: eq(userBookFavorites.userId, userId.value),
    });

    return rows.map((row) => BookIdVO.fromPersistence(row.bookId));
  }
}
