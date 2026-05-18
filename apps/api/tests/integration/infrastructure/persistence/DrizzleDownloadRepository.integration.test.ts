/**
 * DrizzleDownloadRepository Integration Tests
 *
 * Tests the DownloadRepository adapter against a real PostgreSQL database.
 * Requires Docker containers to be running: docker-compose up -d
 *
 * Run with: npm run test:integration
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { DrizzleDownloadRepository } from '../../../../src/infrastructure/driven/persistence/DrizzleDownloadRepository.js';
import { DrizzleUserRepository } from '../../../../src/infrastructure/driven/persistence/DrizzleUserRepository.js';
import { User } from '../../../../src/domain/user/User.js';
import { UserId } from '../../../../src/domain/user/value-objects/UserId.js';
import { BookId } from '../../../../src/domain/book/value-objects/BookId.js';
import { Download } from '../../../../src/domain/download/Download.js';
import * as schema from '../../../../src/infrastructure/driven/persistence/drizzle/schema.js';

const { Pool } = pg;
const { users, userBookDownloads, books } = schema;

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

describe('DrizzleDownloadRepository Integration', () => {
  let pool: pg.Pool;
  let db: ReturnType<typeof drizzle>;
  let repository: DrizzleDownloadRepository;
  let userRepository: DrizzleUserRepository;
  let testUser: User;
  let testTypeId: string;
  let testBookId: BookId;

  beforeAll(async () => {
    const databaseUrl = process.env['DATABASE_URL'] ?? 'postgresql://library:library@localhost:5432/library';

    pool = new Pool({ connectionString: databaseUrl, max: 5 });

    const client = await pool.connect();
    client.release();

    db = drizzle(pool, { schema });
    repository = new DrizzleDownloadRepository(db as any);
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
    await db.delete(userBookDownloads);
    await db.delete(books);
    await db.delete(users);

    // Create a test user
    testUser = User.create({ email: 'download-user@example.com', passwordHash: 'hash' });
    await userRepository.save(testUser);

    // Create a test book directly
    testBookId = BookId.generate();
    await insertTestBook(db as any, testBookId.value, testTypeId);
  });

  describe('upsert', () => {
    it('should create a new download record when none exists', async () => {
      const userId = testUser.id as UserId;
      const download = Download.create(userId, testBookId);

      await repository.upsert(download);

      // Verify the record was persisted
      const row = await (db as any).query.userBookDownloads.findFirst({
        where: (t: any, { and, eq }: any) =>
          and(eq(t.userId, userId.value), eq(t.bookId, testBookId.value)),
      });

      expect(row).not.toBeNull();
      expect(row.userId).toBe(userId.value);
      expect(row.bookId).toBe(testBookId.value);
      expect(row.downloadedAt).toBeInstanceOf(Date);
    });

    it('should update downloadedAt when the record already exists', async () => {
      const userId = testUser.id as UserId;

      // First download — use a fixed past date to detect the update
      const pastDate = new Date('2020-01-01T00:00:00Z');
      const firstDownload = Download.fromPersistence({
        userId: userId.value,
        bookId: testBookId.value,
        downloadedAt: pastDate,
      });
      await repository.upsert(firstDownload);

      // Capture the timestamp after first upsert
      const rowAfterFirst = await (db as any).query.userBookDownloads.findFirst({
        where: (t: any, { and, eq }: any) =>
          and(eq(t.userId, userId.value), eq(t.bookId, testBookId.value)),
      });
      expect(rowAfterFirst.downloadedAt.getTime()).toBeCloseTo(pastDate.getTime(), -3);

      // Small delay to ensure timestamps differ
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Second download — should update downloadedAt to now
      const secondDownload = Download.create(userId, testBookId);
      await repository.upsert(secondDownload);

      const rowAfterSecond = await (db as any).query.userBookDownloads.findFirst({
        where: (t: any, { and, eq }: any) =>
          and(eq(t.userId, userId.value), eq(t.bookId, testBookId.value)),
      });

      expect(rowAfterSecond).not.toBeNull();
      // downloadedAt should be updated (newer than the original pastDate)
      expect(rowAfterSecond.downloadedAt.getTime()).toBeGreaterThan(pastDate.getTime());
    });

    it('should keep only one record per (userId, bookId) after multiple upserts', async () => {
      const userId = testUser.id as UserId;

      const download = Download.create(userId, testBookId);
      await repository.upsert(download);
      await repository.upsert(download);
      await repository.upsert(download);

      const rows = await (db as any).query.userBookDownloads.findMany({
        where: (t: any, { and, eq }: any) =>
          and(eq(t.userId, userId.value), eq(t.bookId, testBookId.value)),
      });

      expect(rows).toHaveLength(1);
    });
  });

  describe('findAllByUser', () => {
    it('should return empty array when user has no downloads', async () => {
      const userId = testUser.id as UserId;

      const result = await repository.findAllByUser(userId.value);

      expect(result).toEqual([]);
    });

    it('should return all downloads for a given user', async () => {
      const userId = testUser.id as UserId;

      // Create a second book
      const secondBookId = BookId.generate();
      await insertTestBook(db as any, secondBookId.value, testTypeId);

      // Upsert two downloads for the user
      const d1 = Download.create(userId, testBookId);
      const d2 = Download.create(userId, secondBookId);
      await repository.upsert(d1);
      await repository.upsert(d2);

      const result = await repository.findAllByUser(userId.value);

      expect(result).toHaveLength(2);
      const bookIds = result.map(d => d.bookId.value);
      expect(bookIds).toContain(testBookId.value);
      expect(bookIds).toContain(secondBookId.value);
    });

    it('should return only downloads belonging to the requested user', async () => {
      const userId = testUser.id as UserId;

      // Create a second user
      const otherUser = User.create({ email: 'other-user@example.com', passwordHash: 'hash' });
      await userRepository.save(otherUser);
      const otherUserId = otherUser.id as UserId;

      // Create a second book for the other user
      const otherBookId = BookId.generate();
      await insertTestBook(db as any, otherBookId.value, testTypeId);

      // Upsert downloads for both users
      await repository.upsert(Download.create(userId, testBookId));
      await repository.upsert(Download.create(otherUserId, otherBookId));

      const result = await repository.findAllByUser(userId.value);

      expect(result).toHaveLength(1);
      expect(result[0]!.userId.value).toBe(userId.value);
      expect(result[0]!.bookId.value).toBe(testBookId.value);
    });

    it('should return Download domain entities with correct fields', async () => {
      const userId = testUser.id as UserId;
      const download = Download.create(userId, testBookId);
      await repository.upsert(download);

      const result = await repository.findAllByUser(userId.value);

      expect(result).toHaveLength(1);
      const retrieved = result[0]!;
      expect(retrieved.userId.value).toBe(userId.value);
      expect(retrieved.bookId.value).toBe(testBookId.value);
      expect(retrieved.downloadedAt).toBeInstanceOf(Date);
    });
  });
});
