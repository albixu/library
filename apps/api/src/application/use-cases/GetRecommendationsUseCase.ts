/**
 * GetRecommendationsUseCase
 *
 * Application service that generates personalized book recommendations
 * for a user based on their downloads and favorites.
 *
 * Flow:
 * 1. Fetch all downloads for the user
 * 2. Fetch all favorite book IDs for the user
 * 3. Combine & deduplicate seeds (downloads + favorites)
 * 4. If no seeds → return empty output
 * 5. Fetch embeddings for seed books
 * 6. If no embeddings → return empty output
 * 7. Compute centroid of seed embeddings
 * 8. Search for similar books (limit 40) using the centroid
 * 9. Filter: exclude seeds, exclude similarity < 0.55, take top 20
 * 10. Determine dominant category from seed books' categories
 * 11. Build output with label and recommendation items
 *
 * HU-040: Book recommendations feature.
 */

import type { BookRepository } from '../ports/BookRepository.js';
import type { DownloadRepository } from '../../domain/download/ports/DownloadRepository.js';
import type { FavoriteRepository } from '../../domain/favorite/ports/FavoriteRepository.js';
import { computeCentroid } from '../../domain/recommendation/centroid.js';
import { getDominantCategory } from '../../domain/recommendation/dominantCategory.js';
import { RecommendationItem } from '../../domain/recommendation/RecommendationItem.js';
import {
  buildRecommendationLabel,
  type GetRecommendationsOutput,
} from '../../domain/recommendation/GetRecommendationsOutput.js';
import { UserId } from '../../domain/user/value-objects/UserId.js';
import { Criteria } from '../../domain/criteria/Criteria.js';
import { Order } from '../../domain/criteria/Order.js';

/** Minimum similarity score to include a book in recommendations */
const SIMILARITY_THRESHOLD = 0.55;

/** Number of candidates to fetch before filtering */
const SEARCH_LIMIT = 40;

/** Maximum number of recommendations to return */
const MAX_RECOMMENDATIONS = 20;

/** Empty output returned when no recommendations can be computed */
const EMPTY_OUTPUT: GetRecommendationsOutput = Object.freeze({ items: Object.freeze([]) as [], label: '' });

/**
 * Dependencies required by GetRecommendationsUseCase
 */
export interface GetRecommendationsUseCaseDeps {
  bookRepository: BookRepository;
  downloadRepository: DownloadRepository;
  favoriteRepository?: FavoriteRepository;
}

/**
 * GetRecommendationsUseCase
 *
 * Generates personalized book recommendations based on user's activity.
 */
export class GetRecommendationsUseCase {
  private readonly bookRepository: BookRepository;
  private readonly downloadRepository: DownloadRepository;
  private readonly favoriteRepository: FavoriteRepository | undefined;

  constructor(deps: GetRecommendationsUseCaseDeps) {
    this.bookRepository = deps.bookRepository;
    this.downloadRepository = deps.downloadRepository;
    this.favoriteRepository = deps.favoriteRepository;
  }

  /**
   * Executes the recommendations use case
   *
   * @param userId - The user UUID
   * @returns Promise resolving to recommendations output with items and label
   */
  async execute(userId: string): Promise<GetRecommendationsOutput> {
    // 1 & 2. Fetch downloads and favorites in parallel
    const [downloads, favoriteBookIds] = await Promise.all([
      this.downloadRepository.findAllByUser(userId),
      this.favoriteRepository
        ? this.favoriteRepository.findAllByUser(UserId.fromPersistence(userId))
        : Promise.resolve([]),
    ]);

    // 3. Combine & deduplicate seed IDs
    const seedIdSet = new Set<string>();
    for (const download of downloads) {
      seedIdSet.add(download.bookId.value);
    }
    for (const bookId of favoriteBookIds) {
      seedIdSet.add(bookId.value);
    }
    const seedIds = Array.from(seedIdSet);

    // 4. If no seeds → return empty
    if (seedIds.length === 0) {
      return EMPTY_OUTPUT;
    }

    // 5. Fetch embeddings for seed books
    const embeddingEntries = await this.bookRepository.findEmbeddingsByIds(seedIds);

    // 6. If no embeddings → return empty
    if (embeddingEntries.length === 0) {
      return EMPTY_OUTPUT;
    }

    // 7. Compute centroid
    const embeddings = embeddingEntries.map((e) => e.embedding);
    const centroid = computeCentroid(embeddings);

    // 8. Fetch categories for seed books (BEFORE search step — seeds are the user's profile)
    const seedCategoryEntries = await this.bookRepository.findCategoriesByIds(seedIds);
    const allSeedCategories = seedCategoryEntries.flatMap((entry) => entry.categories);
    const dominantCategory = getDominantCategory(allSeedCategories);

    // 9. Search for similar books using centroid
    const criteria = Criteria.create({ limit: SEARCH_LIMIT, cursor: null }).withOrder(
      Order.desc('similarity'),
    );
    const searchResult = await this.bookRepository.search(criteria, centroid);

    // 10. Filter: exclude seeds, exclude below threshold, take top 20
    const seedSet = new Set(seedIds);
    const filtered = searchResult.items
      .filter((item) => !seedSet.has(item.book.id))
      .filter((item) => item.similarityScore !== null && item.similarityScore >= SIMILARITY_THRESHOLD)
      .slice(0, MAX_RECOMMENDATIONS);

    // 11. Build output
    const items = filtered.map((item) =>
      RecommendationItem.create({
        bookId: item.book.id,
        title: item.book.title,
        author: item.book.authors.map((a) => a.name).join(', '),
        similarity: item.similarityScore!,
        dominantCategory,
      }),
    );

    return {
      items,
      label: buildRecommendationLabel(dominantCategory),
    };
  }
}
