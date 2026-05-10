/**
 * DrizzleFavoriteRepository Integration Tests
 *
 * Tests the FavoriteRepository adapter against a real PostgreSQL database.
 * Requires Docker containers to be running: docker-compose up -d
 *
 * Run with: npm run test:integration
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { DrizzleFavoriteRepository } from '../../../../src/infrastructure/driven/persistence/DrizzleFavoriteRepository.js';
import { DrizzleUserRepository } from '../../../../src/infrastructure/driven/persistence/DrizzleUserRepository.js';
import { User } from '../../../../src/domain/user/User.js';
import { UserId } from '../../../../src/domain/user/value-objects/UserId.js';
import { BookId } from '../../../../src/domain/book/value-objects/BookId.js';
import { Favorite } from '../../../../src/domain/favorite/Favorite.js';
import * as schema from '../../../../src/infrastructure/driven/persistence/drizzle/schema.js';

const { Pool } = pg;
const { users, userBookFavorites, books } = schema;

/**
 * Creates a minimal book row directly in DB (bypasses full BookRepository setup).
 * Requires a valid typeId from seed data.
 */
async function insertTestBook(db: ReturnType<typeof drizzle>, bookId: string, typeId: string): Promise<void> {
  await db.insert(books).values({
    id: bookId,
    title: `Test Book ${bookId.slice(0, 8)}`,
    originalDescription: 'Test description',
    description: 'Descripción de prueba',
    language: 'en',
    typeId,
    format: 'pdf',
    available: true,
    normalizedTitle: `test book ${bookId.slice(0, 8)}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as typeof schema.books.$inferInsert);
}

describe('DrizzleFavoriteRepository Integration', () => {
  let pool: pg.Pool;
  let db: ReturnType<typeof drizzle>;
  let repository: DrizzleFavoriteRepository;
  let userRepository: DrizzleUserRepository;
  let testUser: User;
  let testTypeId: string;

  let bookId1: BookId;
  let bookId2: BookId;

  beforeAll(async () => {
    const databaseUrl = process.env['DATABASE_URL'] ?? 'postgresql://library:library@localhost:5432/library';

    pool = new Pool({ connectionString: databaseUrl, max: 5 });

    const client = await pool.connect();
    client.release();

    db = drizzle(pool, { schema });
    repository = new DrizzleFavoriteRepository(db as any);
    userRepository = new DrizzleUserRepository(db as any);

    // Fetch a valid typeId from seed data (types table is seeded by init-db.sql)
    const typeRecord = await (db as any).query.types.findFirst();
    if (!typeRecord) {
      throw new Error('No types found in database. Run init-db.sql first.');
    }
    testTypeId = typeRecord.id;
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    // Clean up in FK order
    await db.delete(userBookFavorites);
    await db.delete(books);
    await db.delete(users);

    // Create a test user
    testUser = User.create({ email: 'fav-user@example.com', passwordHash: 'hash' });
    await userRepository.save(testUser);

    // Create test books directly
    bookId1 = BookId.generate();
    bookId2 = BookId.generate();
    await insertTestBook(db as any, bookId1.value, testTypeId);
    await insertTestBook(db as any, bookId2.value, testTypeId);
  });

  describe('add', () => {
    it('should persist a new favorite', async () => {
      const userId = testUser.id as UserId;
      const favorite = Favorite.create(userId, bookId1);

      await repository.add(favorite);

      const found = await repository.findByUserAndBook(userId, bookId1);
      expect(found).not.toBeNull();
      expect(found!.userId.value).toBe(userId.value);
      expect(found!.bookId.value).toBe(bookId1.value);
    });
  });

  describe('findByUserAndBook', () => {
    it('should return a Favorite when found', async () => {
      const userId = testUser.id as UserId;
      const favorite = Favorite.create(userId, bookId1);
      await repository.add(favorite);

      const found = await repository.findByUserAndBook(userId, bookId1);

      expect(found).not.toBeNull();
      expect(found!.userId.value).toBe(userId.value);
      expect(found!.bookId.value).toBe(bookId1.value);
    });

    it('should return null when the favorite does not exist', async () => {
      const userId = testUser.id as UserId;
      const nonExistentBookId = BookId.generate();

      // Insert the non-existent book so FK is satisfied, but don't add favorite
      await insertTestBook(db as any, nonExistentBookId.value, testTypeId);

      const found = await repository.findByUserAndBook(userId, nonExistentBookId);
      expect(found).toBeNull();
    });

    it('should return null when user has no favorites at all', async () => {
      const userId = testUser.id as UserId;
      const found = await repository.findByUserAndBook(userId, bookId1);
      expect(found).toBeNull();
    });
  });

  describe('remove', () => {
    it('should remove an existing favorite', async () => {
      const userId = testUser.id as UserId;
      const favorite = Favorite.create(userId, bookId1);
      await repository.add(favorite);

      await repository.remove(userId, bookId1);

      const found = await repository.findByUserAndBook(userId, bookId1);
      expect(found).toBeNull();
    });

    it('should not throw when removing a non-existent favorite', async () => {
      const userId = testUser.id as UserId;
      await expect(repository.remove(userId, bookId1)).resolves.not.toThrow();
    });
  });

  describe('findAllByUser', () => {
    it('should return all BookIds favorited by the user', async () => {
      const userId = testUser.id as UserId;
      await repository.add(Favorite.create(userId, bookId1));
      await repository.add(Favorite.create(userId, bookId2));

      const result = await repository.findAllByUser(userId);

      expect(result).toHaveLength(2);
      const resultValues = result.map((id) => id.value);
      expect(resultValues).toContain(bookId1.value);
      expect(resultValues).toContain(bookId2.value);
    });

    it('should return an empty array when the user has no favorites', async () => {
      const userId = testUser.id as UserId;

      const result = await repository.findAllByUser(userId);

      expect(result).toHaveLength(0);
    });

    it('should only return favorites for the requested user', async () => {
      // Create a second user
      const otherUser = User.create({ email: 'other-user@example.com', passwordHash: 'hash' });
      await userRepository.save(otherUser);

      const userId = testUser.id as UserId;
      const otherUserId = otherUser.id as UserId;

      // User 1 favorites book1, user 2 favorites book2
      await repository.add(Favorite.create(userId, bookId1));
      await repository.add(Favorite.create(otherUserId, bookId2));

      const result = await repository.findAllByUser(userId);

      expect(result).toHaveLength(1);
      expect(result[0]!.value).toBe(bookId1.value);
    });
  });
});
