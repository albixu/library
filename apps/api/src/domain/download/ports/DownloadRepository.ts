/**
 * DownloadRepository Port (Driven/Output Port)
 *
 * Defines the contract for download persistence operations.
 * This is a pure domain port — no infrastructure dependencies.
 *
 * HU-039: Downloads domain port for persistence.
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
}
