/**
 * DownloadRepository Port Contract Tests
 *
 * HU-040: Verifies the DownloadRepository port includes findAllByUser method.
 * These are compile-time contract tests — the interface must define the method.
 */

import { describe, it, expect, vi } from 'vitest';
import type { DownloadRepository } from '../../../../src/domain/download/ports/DownloadRepository.js';
import { Download } from '../../../../src/domain/download/Download.js';
import { UserId } from '../../../../src/domain/user/value-objects/UserId.js';
import { BookId } from '../../../../src/domain/book/value-objects/BookId.js';

const USER_UUID = '550e8400-e29b-41d4-a716-446655440001';
const BOOK_UUID = '550e8400-e29b-41d4-a716-446655440002';

describe('DownloadRepository port', () => {
  describe('findAllByUser', () => {
    it('should define findAllByUser method in the port interface', () => {
      // Create a mock implementation to verify the interface contract
      const mockRepo: DownloadRepository = {
        upsert: vi.fn(),
        findAllByUser: vi.fn().mockResolvedValue([]),
      };

      expect(typeof mockRepo.findAllByUser).toBe('function');
    });

    it('should return an array of Download instances for a given userId', async () => {
      const download = Download.fromPersistence({
        userId: USER_UUID,
        bookId: BOOK_UUID,
        downloadedAt: new Date('2024-01-01T00:00:00Z'),
      });

      const mockRepo: DownloadRepository = {
        upsert: vi.fn(),
        findAllByUser: vi.fn().mockResolvedValue([download]),
      };

      const result = await mockRepo.findAllByUser(USER_UUID);

      expect(result).toHaveLength(1);
      expect(result[0].userId.value).toBe(USER_UUID);
      expect(result[0].bookId.value).toBe(BOOK_UUID);
    });

    it('should return empty array when user has no downloads', async () => {
      const mockRepo: DownloadRepository = {
        upsert: vi.fn(),
        findAllByUser: vi.fn().mockResolvedValue([]),
      };

      const result = await mockRepo.findAllByUser(USER_UUID);

      expect(result).toEqual([]);
    });
  });

  describe('upsert (existing method)', () => {
    it('should still define upsert method', () => {
      const mockRepo: DownloadRepository = {
        upsert: vi.fn(),
        findAllByUser: vi.fn().mockResolvedValue([]),
      };

      expect(typeof mockRepo.upsert).toBe('function');
    });
  });
});
