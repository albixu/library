/**
 * DrizzleDownloadRepository Adapter
 *
 * Implements the DownloadRepository port using Drizzle ORM with PostgreSQL.
 * This is a driven/output adapter in the hexagonal architecture.
 *
 * HU-039: Persistence adapter for Download entity.
 */

import type { DownloadRepository } from '../../../domain/download/ports/DownloadRepository.js';
import type { Download } from '../../../domain/download/Download.js';
import { userBookDownloads } from './drizzle/schema.js';
import type { DatabaseClient } from './types.js';

/**
 * DrizzleDownloadRepository
 *
 * Adapter that implements DownloadRepository using Drizzle ORM.
 * Uses INSERT ... ON CONFLICT DO UPDATE (upsert) to handle repeated downloads.
 */
export class DrizzleDownloadRepository implements DownloadRepository {
  constructor(private readonly db: DatabaseClient) {}

  /**
   * Creates or updates a download record for the (userId, bookId) pair.
   *
   * Uses PostgreSQL's ON CONFLICT DO UPDATE to atomically upsert the record.
   * If a record already exists for the (userId, bookId) pair, only the
   * downloadedAt timestamp is updated.
   */
  async upsert(download: Download): Promise<void> {
    await this.db
      .insert(userBookDownloads)
      .values({
        userId: download.userId.value,
        bookId: download.bookId.value,
        downloadedAt: download.downloadedAt,
      })
      .onConflictDoUpdate({
        target: [userBookDownloads.userId, userBookDownloads.bookId],
        set: { downloadedAt: new Date() },
      });
  }
}
