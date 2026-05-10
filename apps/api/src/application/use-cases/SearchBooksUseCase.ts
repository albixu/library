/**
 * SearchBooksUseCase
 *
 * Application service that orchestrates book search with filters and pagination.
 * This use case coordinates between the domain Criteria pattern and infrastructure ports.
 *
 * Flow:
 * 1. Validate and normalize input parameters
 * 2. Generate embedding if text filter is present (semantic search)
 * 3. Build domain Criteria from input filters
 * 4. Execute search via BookRepository
 * 5. Map results to output DTOs
 *
 * HU-012: Implements book search with:
 * - Multiple filter types (ISBN, title, author, types, categories, levels, text)
 * - Filters combined with AND logic
 * - List filters (types, categories, levels) use OR between values
 * - Semantic search with 55% similarity threshold (calibrated for nomic-embed-text)
 * - Cursor-based pagination
 * - Order by title (A-Z) or by similarity (desc) when using text filter
 */

import { Criteria } from '../../domain/criteria/Criteria.js';
import { Order } from '../../domain/criteria/Order.js';
import { Filter } from '../../domain/criteria/Filter.js';
import type { BookRepository, SearchBooksResult } from '../ports/BookRepository.js';
import type { EmbeddingService } from '../ports/EmbeddingService.js';
import type { FavoriteRepository } from '../../domain/favorite/ports/FavoriteRepository.js';
import type { Logger } from '../ports/Logger.js';
import { noopLogger } from '../ports/Logger.js';
import type { UserId } from '../../domain/user/value-objects/UserId.js';
import type { BookId } from '../../domain/book/value-objects/BookId.js';

/**
 * Input DTO for searching books
 *
 * All filters are optional. When multiple filters are provided,
 * they are combined with AND logic.
 */
export interface SearchBooksInput {
  /** ISBN for exact match */
  isbn?: string;
  /** Partial title match (case-insensitive) */
  title?: string;
  /** Partial author name match (case-insensitive) */
  author?: string;
  /** List of type names (OR between values) */
  types?: string[];
  /** List of category names (OR between values) */
  categories?: string[];
  /** List of level names (OR between values) */
  levels?: string[];
  /** Free text for semantic search (generates embedding) */
  text?: string;
  /** Maximum number of results (1-100, default 50) */
  limit?: number;
  /** Cursor for pagination */
  cursor?: string;
  /** If provided, only returns books favorited by this user */
  favoritesOf?: UserId;
}

/**
 * Output DTO for a single book in search results
 *
 * HU-013: Added originalDescription and language fields
 */
export interface SearchBooksItemOutput {
  id: string;
  isbn: string | null;
  title: string;
  authors: { id: string; name: string }[];
  type: string;
  categories: { id: string; name: string }[];
  level: string | null;
  format: string;
  originalDescription: string; // HU-013: Description in original language
  description: string; // HU-013: Spanish description
  language: string; // HU-013: ISO 639-1 code
  similarityScore: number | null;
}

/**
 * Pagination metadata in search results
 */
export interface SearchBooksPagination {
  limit: number;
  hasNextPage: boolean;
  nextCursor: string | null;
  totalCount: number;
}

/**
 * Output DTO for search results
 */
export interface SearchBooksOutput {
  items: SearchBooksItemOutput[];
  pagination: SearchBooksPagination;
}

/**
 * Dependencies required by SearchBooksUseCase
 */
export interface SearchBooksUseCaseDeps {
  bookRepository: BookRepository;
  embeddingService: EmbeddingService;
  logger?: Logger;
  favoriteRepository?: FavoriteRepository;
}

/**
 * SearchBooksUseCase
 *
 * Orchestrates book search with filters, pagination, and optional semantic search.
 */
export class SearchBooksUseCase {
  private readonly bookRepository: BookRepository;
  private readonly embeddingService: EmbeddingService;
  private readonly logger: Logger;
  private readonly favoriteRepository: FavoriteRepository | undefined;

  constructor(deps: SearchBooksUseCaseDeps) {
    this.bookRepository = deps.bookRepository;
    this.embeddingService = deps.embeddingService;
    this.logger = deps.logger?.child({ name: 'SearchBooksUseCase' }) ?? noopLogger;
    this.favoriteRepository = deps.favoriteRepository;
  }

  /**
   * Executes the book search use case
   *
   * @param input - The search parameters
   * @returns Promise resolving to paginated search results
   * @throws EmbeddingServiceUnavailableError if embedding service fails (only when text filter is used)
   */
  async execute(input: SearchBooksInput): Promise<SearchBooksOutput> {
    const limit = input.limit ?? Criteria.getDefaultLimit();

    this.logger.debug('Starting book search', {
      hasTextFilter: !!input.text,
      filterCount: this.countFilters(input),
      limit,
      hasCursor: !!input.cursor,
      hasFavoritesFilter: !!input.favoritesOf,
    });

    // 1. If filtering by favorites, resolve the bookId list first
    let favoriteBookIds: BookId[] | undefined;
    if (input.favoritesOf) {
      favoriteBookIds = await this.favoriteRepository!.findAllByUser(input.favoritesOf);

      // Short-circuit: if user has no favorites, return empty result immediately
      if (favoriteBookIds.length === 0) {
        return {
          items: [],
          pagination: { limit, hasNextPage: false, nextCursor: null, totalCount: 0 },
        };
      }
    }

    // 2. Generate embedding if text filter is present
    let embedding: number[] | undefined;
    if (input.text) {
      this.logger.debug('Generating embedding for semantic search', {
        textLength: input.text.length,
      });

      const embeddingResult = await this.embeddingService.generateEmbedding(input.text);
      embedding = embeddingResult.embedding;

      this.logger.debug('Embedding generated successfully', {
        dimensions: embedding.length,
      });
    }

    // 3. Build Criteria from input
    const criteria = this.buildCriteria(input, limit);

    this.logger.debug('Criteria built', {
      filterCount: criteria.filters.count(),
      hasOrder: criteria.hasOrder(),
      hasSimilarityFilter: criteria.hasSimilarityFilter(),
    });

    // 4. Execute search — pass favoriteBookIds to let the repository filter at DB level
    const result = await this.bookRepository.search(criteria, embedding, favoriteBookIds);

    this.logger.info('Book search completed', {
      resultCount: result.items.length,
      totalCount: result.totalCount,
      hasNextPage: result.hasNextPage,
    });

    // 5. Map results to output
    return this.toOutput(result, limit);
  }

  /**
   * Builds a Criteria object from the input parameters
   */
  private buildCriteria(input: SearchBooksInput, limit: number): Criteria {
    const filters: Filter[] = [];

    // ISBN filter (exact match)
    if (input.isbn) {
      filters.push(Filter.equals('isbn', input.isbn));
    }

    // Title filter (partial match)
    if (input.title) {
      filters.push(Filter.contains('title', input.title));
    }

    // Author filter (partial match)
    if (input.author) {
      filters.push(Filter.contains('author', input.author));
    }

    // Types filter (OR between values)
    if (input.types && input.types.length > 0) {
      filters.push(Filter.in('type', input.types));
    }

    // Categories filter (OR between values)
    if (input.categories && input.categories.length > 0) {
      filters.push(Filter.in('categories', input.categories));
    }

    // Levels filter (OR between values)
    if (input.levels && input.levels.length > 0) {
      filters.push(Filter.in('levels', input.levels));
    }

    // Text filter (semantic search)
    if (input.text) {
      filters.push(Filter.similarTo('embedding', input.text));
    }

    // Build criteria with filters
    let criteria = Criteria.create({
      limit,
      cursor: input.cursor ?? null,
    });

    // Add filters
    if (filters.length > 0) {
      criteria = criteria.withFilters(filters);
    }

    // Set order based on presence of text filter
    if (input.text) {
      // Order by similarity score descending for semantic search
      criteria = criteria.withOrder(Order.desc('similarity'));
    } else {
      // Order by title ascending for regular search
      criteria = criteria.withOrder(Order.asc('title'));
    }

    return criteria;
  }

  /**
   * Maps repository result to output DTO
   */
  private toOutput(result: SearchBooksResult, limit: number): SearchBooksOutput {
    return {
      items: result.items.map((item) => ({
        id: item.book.id,
        isbn: item.book.isbn?.value ?? null,
        title: item.book.title,
        authors: item.book.authors.map((a) => ({ id: a.id, name: a.name })),
        type: item.book.type.name,
        categories: item.book.categories.map((c) => ({ id: c.id, name: c.name })),
        level: item.levelName,
        format: item.book.format.value,
        originalDescription: item.book.originalDescription, // HU-013
        description: item.book.description, // HU-013: Spanish description
        language: item.book.language, // HU-013
        similarityScore: item.similarityScore,
      })),
      pagination: {
        limit,
        hasNextPage: result.hasNextPage,
        nextCursor: result.nextCursor,
        totalCount: result.totalCount,
      },
    };
  }

  /**
   * Counts the number of filters provided in input
   */
  private countFilters(input: SearchBooksInput): number {
    let count = 0;
    if (input.isbn) {count++;}
    if (input.title) {count++;}
    if (input.author) {count++;}
    if (input.types && input.types.length > 0) {count++;}
    if (input.categories && input.categories.length > 0) {count++;}
    if (input.levels && input.levels.length > 0) {count++;}
    if (input.text) {count++;}
    return count;
  }
}
