/**
 * Unit Tests: RegisterDownloadUseCase
 *
 * Tests for the use case that registers a book download event.
 * HU-039: Downloads feature.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RegisterDownloadUseCase } from '../../../../../src/application/use-cases/download/RegisterDownloadUseCase.js';
import { UserId } from '../../../../../src/domain/user/value-objects/UserId.js';
import { BookId } from '../../../../../src/domain/book/value-objects/BookId.js';
import { Download } from '../../../../../src/domain/download/Download.js';
import type { DownloadRepository } from '../../../../../src/domain/download/ports/DownloadRepository.js';

describe('RegisterDownloadUseCase', () => {
  const userId = UserId.fromPersistence('550e8400-e29b-41d4-a716-446655440001');
  const bookId = BookId.fromPersistence('550e8400-e29b-41d4-a716-446655440002');

  let mockDownloadRepository: DownloadRepository;
  let useCase: RegisterDownloadUseCase;

  beforeEach(() => {
    mockDownloadRepository = {
      upsert: vi.fn(),
    };

    useCase = new RegisterDownloadUseCase({ downloadRepository: mockDownloadRepository });
  });

  describe('execute — happy path', () => {
    it('should call upsert with a Download entity', async () => {
      vi.mocked(mockDownloadRepository.upsert).mockResolvedValue(undefined);

      await useCase.execute({ userId, bookId });

      expect(mockDownloadRepository.upsert).toHaveBeenCalledTimes(1);
      const passedDownload = vi.mocked(mockDownloadRepository.upsert).mock.calls[0]?.[0];
      expect(passedDownload).toBeInstanceOf(Download);
      expect(passedDownload?.userId.equals(userId)).toBe(true);
      expect(passedDownload?.bookId.equals(bookId)).toBe(true);
    });

    it('should resolve without returning a value', async () => {
      vi.mocked(mockDownloadRepository.upsert).mockResolvedValue(undefined);

      const result = await useCase.execute({ userId, bookId });

      expect(result).toBeUndefined();
    });
  });

  describe('execute — error propagation', () => {
    it('should propagate errors thrown by the repository', async () => {
      const repositoryError = new Error('Database connection failed');
      vi.mocked(mockDownloadRepository.upsert).mockRejectedValue(repositoryError);

      await expect(useCase.execute({ userId, bookId })).rejects.toThrow('Database connection failed');
    });
  });
});
