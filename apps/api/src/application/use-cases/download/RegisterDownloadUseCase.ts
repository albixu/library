/**
 * RegisterDownloadUseCase
 *
 * Application use case that registers a book download event for a user.
 *
 * Flow:
 * 1. Create a Download entity with the current timestamp
 * 2. Call DownloadRepository.upsert() — creates or updates the record
 *
 * HU-039: Register download use case.
 */

import type { DownloadRepository } from '../../../domain/download/ports/DownloadRepository.js';
import { Download } from '../../../domain/download/Download.js';
import type { UserId } from '../../../domain/user/value-objects/UserId.js';
import type { BookId } from '../../../domain/book/value-objects/BookId.js';

/**
 * Input DTO for the register download use case
 */
export interface RegisterDownloadInput {
  userId: UserId;
  bookId: BookId;
}

/**
 * Dependencies required by RegisterDownloadUseCase
 */
export interface RegisterDownloadUseCaseDeps {
  downloadRepository: DownloadRepository;
}

/**
 * RegisterDownloadUseCase
 *
 * Persists a download event (upsert) for a (userId, bookId) pair.
 * Errors from the repository are propagated as-is.
 */
export class RegisterDownloadUseCase {
  private readonly downloadRepository: DownloadRepository;

  constructor(deps: RegisterDownloadUseCaseDeps) {
    this.downloadRepository = deps.downloadRepository;
  }

  /**
   * Executes the register download use case
   *
   * @param input - The userId and bookId of the download event
   * @returns Promise that resolves when the download is recorded
   */
  async execute(input: RegisterDownloadInput): Promise<void> {
    const { userId, bookId } = input;
    const download = Download.create(userId, bookId);
    await this.downloadRepository.upsert(download);
  }
}
