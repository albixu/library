/**
 * Unit Tests: ToggleFavoriteUseCase
 *
 * Tests for the use case that toggles a book as favorite for a user.
 * HU-039: Favorites feature.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ToggleFavoriteUseCase } from '../../../../../src/application/use-cases/favorite/ToggleFavoriteUseCase.js';
import { UserId } from '../../../../../src/domain/user/value-objects/UserId.js';
import { BookId } from '../../../../../src/domain/book/value-objects/BookId.js';
import { Favorite } from '../../../../../src/domain/favorite/Favorite.js';
import type { FavoriteRepository } from '../../../../../src/domain/favorite/ports/FavoriteRepository.js';

describe('ToggleFavoriteUseCase', () => {
  const userId = UserId.fromPersistence('550e8400-e29b-41d4-a716-446655440001');
  const bookId = BookId.fromPersistence('550e8400-e29b-41d4-a716-446655440002');

  let mockFavoriteRepository: FavoriteRepository;
  let useCase: ToggleFavoriteUseCase;

  beforeEach(() => {
    mockFavoriteRepository = {
      findByUserAndBook: vi.fn(),
      add: vi.fn(),
      remove: vi.fn(),
      findAllByUser: vi.fn(),
    };

    useCase = new ToggleFavoriteUseCase({ favoriteRepository: mockFavoriteRepository });
  });

  describe('execute — book not yet favorited', () => {
    it('should add the favorite and return { favorite: true }', async () => {
      vi.mocked(mockFavoriteRepository.findByUserAndBook).mockResolvedValue(null);
      vi.mocked(mockFavoriteRepository.add).mockResolvedValue(undefined);

      const result = await useCase.execute({ userId, bookId });

      expect(result).toEqual({ favorite: true });
    });

    it('should call add with a Favorite entity', async () => {
      vi.mocked(mockFavoriteRepository.findByUserAndBook).mockResolvedValue(null);
      vi.mocked(mockFavoriteRepository.add).mockResolvedValue(undefined);

      await useCase.execute({ userId, bookId });

      expect(mockFavoriteRepository.add).toHaveBeenCalledTimes(1);
      const addedFavorite = vi.mocked(mockFavoriteRepository.add).mock.calls[0]?.[0];
      expect(addedFavorite).toBeInstanceOf(Favorite);
      expect(addedFavorite?.userId.equals(userId)).toBe(true);
      expect(addedFavorite?.bookId.equals(bookId)).toBe(true);
    });

    it('should not call remove when the book is not favorited', async () => {
      vi.mocked(mockFavoriteRepository.findByUserAndBook).mockResolvedValue(null);
      vi.mocked(mockFavoriteRepository.add).mockResolvedValue(undefined);

      await useCase.execute({ userId, bookId });

      expect(mockFavoriteRepository.remove).not.toHaveBeenCalled();
    });
  });

  describe('execute — book already favorited', () => {
    it('should remove the favorite and return { favorite: false }', async () => {
      const existingFavorite = Favorite.create(userId, bookId);
      vi.mocked(mockFavoriteRepository.findByUserAndBook).mockResolvedValue(existingFavorite);
      vi.mocked(mockFavoriteRepository.remove).mockResolvedValue(undefined);

      const result = await useCase.execute({ userId, bookId });

      expect(result).toEqual({ favorite: false });
    });

    it('should call remove with the correct userId and bookId', async () => {
      const existingFavorite = Favorite.create(userId, bookId);
      vi.mocked(mockFavoriteRepository.findByUserAndBook).mockResolvedValue(existingFavorite);
      vi.mocked(mockFavoriteRepository.remove).mockResolvedValue(undefined);

      await useCase.execute({ userId, bookId });

      expect(mockFavoriteRepository.remove).toHaveBeenCalledWith(userId, bookId);
    });

    it('should not call add when the book is already favorited', async () => {
      const existingFavorite = Favorite.create(userId, bookId);
      vi.mocked(mockFavoriteRepository.findByUserAndBook).mockResolvedValue(existingFavorite);
      vi.mocked(mockFavoriteRepository.remove).mockResolvedValue(undefined);

      await useCase.execute({ userId, bookId });

      expect(mockFavoriteRepository.add).not.toHaveBeenCalled();
    });
  });

  describe('execute — lookup', () => {
    it('should call findByUserAndBook with the correct userId and bookId', async () => {
      vi.mocked(mockFavoriteRepository.findByUserAndBook).mockResolvedValue(null);
      vi.mocked(mockFavoriteRepository.add).mockResolvedValue(undefined);

      await useCase.execute({ userId, bookId });

      expect(mockFavoriteRepository.findByUserAndBook).toHaveBeenCalledWith(userId, bookId);
    });
  });
});
