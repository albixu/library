import { describe, it, expect } from 'vitest';
import { Download } from '../../../../src/domain/download/Download.js';
import { UserId } from '../../../../src/domain/user/value-objects/UserId.js';
import { BookId } from '../../../../src/domain/book/value-objects/BookId.js';

const USER_UUID = '550e8400-e29b-41d4-a716-446655440001';
const BOOK_UUID = '550e8400-e29b-41d4-a716-446655440002';

describe('Download', () => {
  describe('create', () => {
    it('should create a Download with the given userId and bookId', () => {
      const userId = UserId.fromPersistence(USER_UUID);
      const bookId = BookId.fromPersistence(BOOK_UUID);

      const download = Download.create(userId, bookId);

      expect(download.userId.value).toBe(USER_UUID);
      expect(download.bookId.value).toBe(BOOK_UUID);
    });

    it('should set downloadedAt to current date', () => {
      const before = new Date();
      const download = Download.create(
        UserId.fromPersistence(USER_UUID),
        BookId.fromPersistence(BOOK_UUID),
      );
      const after = new Date();

      expect(download.downloadedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(download.downloadedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('fromPersistence', () => {
    it('should reconstruct a Download from persistence data', () => {
      const downloadedAt = new Date('2024-06-01T12:00:00Z');

      const download = Download.fromPersistence({
        userId: USER_UUID,
        bookId: BOOK_UUID,
        downloadedAt,
      });

      expect(download.userId.value).toBe(USER_UUID);
      expect(download.bookId.value).toBe(BOOK_UUID);
      expect(download.downloadedAt).toBe(downloadedAt);
    });
  });

  describe('immutability', () => {
    it('should be frozen', () => {
      const download = Download.create(
        UserId.fromPersistence(USER_UUID),
        BookId.fromPersistence(BOOK_UUID),
      );
      expect(Object.isFrozen(download)).toBe(true);
    });

    it('should not allow reassigning bookId', () => {
      const download = Download.create(
        UserId.fromPersistence(USER_UUID),
        BookId.fromPersistence(BOOK_UUID),
      );
      expect(() => {
        // @ts-expect-error testing immutability
        download.bookId = BookId.generate();
      }).toThrow();
    });
  });

  describe('equals', () => {
    it('should return true for two Downloads with the same userId and bookId', () => {
      const d1 = Download.fromPersistence({ userId: USER_UUID, bookId: BOOK_UUID, downloadedAt: new Date() });
      const d2 = Download.fromPersistence({ userId: USER_UUID, bookId: BOOK_UUID, downloadedAt: new Date() });
      expect(d1.equals(d2)).toBe(true);
    });

    it('should return false when userId differs', () => {
      const otherUser = '770e8400-e29b-41d4-a716-446655440099';
      const d1 = Download.fromPersistence({ userId: USER_UUID, bookId: BOOK_UUID, downloadedAt: new Date() });
      const d2 = Download.fromPersistence({ userId: otherUser, bookId: BOOK_UUID, downloadedAt: new Date() });
      expect(d1.equals(d2)).toBe(false);
    });
  });
});
