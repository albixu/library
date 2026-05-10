import { describe, it, expect } from 'vitest';
import { Favorite } from '../../../../src/domain/favorite/Favorite.js';
import { UserId } from '../../../../src/domain/user/value-objects/UserId.js';
import { BookId } from '../../../../src/domain/book/value-objects/BookId.js';

const USER_UUID = '550e8400-e29b-41d4-a716-446655440001';
const BOOK_UUID = '550e8400-e29b-41d4-a716-446655440002';

describe('Favorite', () => {
  describe('create', () => {
    it('should create a Favorite with the given userId and bookId', () => {
      const userId = UserId.fromPersistence(USER_UUID);
      const bookId = BookId.fromPersistence(BOOK_UUID);

      const favorite = Favorite.create(userId, bookId);

      expect(favorite.userId.value).toBe(USER_UUID);
      expect(favorite.bookId.value).toBe(BOOK_UUID);
    });

    it('should set createdAt to current date', () => {
      const before = new Date();
      const favorite = Favorite.create(
        UserId.fromPersistence(USER_UUID),
        BookId.fromPersistence(BOOK_UUID),
      );
      const after = new Date();

      expect(favorite.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(favorite.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('fromPersistence', () => {
    it('should reconstruct a Favorite from persistence data', () => {
      const createdAt = new Date('2024-06-01T12:00:00Z');

      const favorite = Favorite.fromPersistence({
        userId: USER_UUID,
        bookId: BOOK_UUID,
        createdAt,
      });

      expect(favorite.userId.value).toBe(USER_UUID);
      expect(favorite.bookId.value).toBe(BOOK_UUID);
      expect(favorite.createdAt).toBe(createdAt);
    });
  });

  describe('immutability', () => {
    it('should be frozen', () => {
      const favorite = Favorite.create(
        UserId.fromPersistence(USER_UUID),
        BookId.fromPersistence(BOOK_UUID),
      );
      expect(Object.isFrozen(favorite)).toBe(true);
    });

    it('should not allow reassigning userId', () => {
      const favorite = Favorite.create(
        UserId.fromPersistence(USER_UUID),
        BookId.fromPersistence(BOOK_UUID),
      );
      expect(() => {
        // @ts-expect-error testing immutability
        favorite.userId = UserId.generate();
      }).toThrow();
    });
  });

  describe('equals', () => {
    it('should return true for two Favorites with the same userId and bookId', () => {
      const f1 = Favorite.fromPersistence({ userId: USER_UUID, bookId: BOOK_UUID, createdAt: new Date() });
      const f2 = Favorite.fromPersistence({ userId: USER_UUID, bookId: BOOK_UUID, createdAt: new Date() });
      expect(f1.equals(f2)).toBe(true);
    });

    it('should return false when bookId differs', () => {
      const otherBook = '660e8400-e29b-41d4-a716-446655440099';
      const f1 = Favorite.fromPersistence({ userId: USER_UUID, bookId: BOOK_UUID, createdAt: new Date() });
      const f2 = Favorite.fromPersistence({ userId: USER_UUID, bookId: otherBook, createdAt: new Date() });
      expect(f1.equals(f2)).toBe(false);
    });

    it('should return false when userId differs', () => {
      const otherUser = '770e8400-e29b-41d4-a716-446655440099';
      const f1 = Favorite.fromPersistence({ userId: USER_UUID, bookId: BOOK_UUID, createdAt: new Date() });
      const f2 = Favorite.fromPersistence({ userId: otherUser, bookId: BOOK_UUID, createdAt: new Date() });
      expect(f1.equals(f2)).toBe(false);
    });
  });
});
