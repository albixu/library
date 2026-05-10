/**
 * ToggleFavoriteUseCase
 *
 * Application use case that toggles a book as favorite for a user.
 *
 * Flow:
 * 1. Check if the (userId, bookId) pair already exists in favorites
 * 2. If it exists → remove it and return { favorite: false }
 * 3. If it does not exist → create and persist it, return { favorite: true }
 *
 * HU-039: Toggle favorite use case.
 */

import type { FavoriteRepository } from '../../../domain/favorite/ports/FavoriteRepository.js';
import { Favorite } from '../../../domain/favorite/Favorite.js';
import type { UserId } from '../../../domain/user/value-objects/UserId.js';
import type { BookId } from '../../../domain/book/value-objects/BookId.js';

/**
 * Input DTO for the toggle favorite use case
 */
export interface ToggleFavoriteInput {
  userId: UserId;
  bookId: BookId;
}

/**
 * Output DTO for the toggle favorite use case
 */
export interface ToggleFavoriteOutput {
  favorite: boolean;
}

/**
 * Dependencies required by ToggleFavoriteUseCase
 */
export interface ToggleFavoriteUseCaseDeps {
  favoriteRepository: FavoriteRepository;
}

/**
 * ToggleFavoriteUseCase
 *
 * Adds or removes a book from a user's favorites based on current state.
 */
export class ToggleFavoriteUseCase {
  private readonly favoriteRepository: FavoriteRepository;

  constructor(deps: ToggleFavoriteUseCaseDeps) {
    this.favoriteRepository = deps.favoriteRepository;
  }

  /**
   * Executes the toggle favorite use case
   *
   * @param input - The userId and bookId to toggle
   * @returns Promise resolving to { favorite: true } if added, { favorite: false } if removed
   */
  async execute(input: ToggleFavoriteInput): Promise<ToggleFavoriteOutput> {
    const { userId, bookId } = input;

    const existing = await this.favoriteRepository.findByUserAndBook(userId, bookId);

    if (existing) {
      await this.favoriteRepository.remove(userId, bookId);
      return { favorite: false };
    }

    const favorite = Favorite.create(userId, bookId);
    await this.favoriteRepository.add(favorite);
    return { favorite: true };
  }
}
