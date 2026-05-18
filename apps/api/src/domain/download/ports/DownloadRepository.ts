/**
 * DownloadRepository Port (Driven/Output Port)
 *
 * Defines the contract for download persistence operations.
 * This is a pure domain port — no infrastructure dependencies.
 *
 * HU-039: Downloads domain port for persistence.
 * HU-040: Added findAllByUser for recommendations feature.
 */

import type { Download } from '../Download.js';

/**
 * DownloadRepository Port Interface
 *
 * Provides operations for managing download records in the persistence layer.
 */
export interface DownloadRepository {
  /**
   * Creates or updates a download record for the (userId, bookId) pair.
   * Updates the downloadedAt timestamp if the record already exists.
   */
  upsert(download: Download): Promise<void>;

  /**
   * Retrieves all download records for a given user.
   *
   * Used by the recommendations engine to find which books the user
   * has already downloaded, in order to compute similarity-based suggestions.
   *
   * @param userId - The user UUID
   * @returns Promise resolving to an array of Download entities for the user
   */
  findAllByUser(userId: string): Promise<Download[]>;
}
