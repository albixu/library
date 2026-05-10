import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  SearchBooksUseCase,
  type SearchBooksInput,
  type SearchBooksUseCaseDeps,
} from '../../../../src/application/use-cases/SearchBooksUseCase.js';
import type { BookRepository, SearchBooksResult, BookWithScore } from '../../../../src/application/ports/BookRepository.js';
import type { EmbeddingService } from '../../../../src/application/ports/EmbeddingService.js';
import type { FavoriteRepository } from '../../../../src/domain/favorite/ports/FavoriteRepository.js';
import { Book } from '../../../../src/domain/entities/Book.js';
import { Author } from '../../../../src/domain/entities/Author.js';
import { BookType } from '../../../../src/domain/entities/BookType.js';
import { Category } from '../../../../src/domain/entities/Category.js';
import { EmbeddingServiceUnavailableError } from '../../../../src/application/errors/ApplicationErrors.js';
import { UserId } from '../../../../src/domain/user/value-objects/UserId.js';
import { BookId } from '../../../../src/domain/book/value-objects/BookId.js';

describe('SearchBooksUseCase', () => {
  // Test data
  const validUUID = '550e8400-e29b-41d4-a716-446655440000';
  const validTypeId = 'bb0e8400-e29b-41d4-a716-446655440001';
  const validCategoryId = 'cc0e8400-e29b-41d4-a716-446655440002';
  const validAuthorId = 'dd0e8400-e29b-41d4-a716-446655440003';

  // Mock dependencies
  let mockBookRepository: {
    search: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    findByIsbn: ReturnType<typeof vi.fn>;
    existsByIsbn: ReturnType<typeof vi.fn>;
    checkDuplicate: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    findAll: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };

  let mockEmbeddingService: {
    generateEmbedding: ReturnType<typeof vi.fn>;
    isAvailable: ReturnType<typeof vi.fn>;
  };

  let mockFavoriteRepository: FavoriteRepository;

  let useCase: SearchBooksUseCase;

  // Helper to create test book
  const createTestBook = (overrides: Partial<{
    id: string;
    title: string;
    authorName: string;
    typeName: string;
    categoryName: string;
  }> = {}): Book => {
    const id = overrides.id ?? validUUID;
    const typeName = overrides.typeName ?? 'technical';
    const categoryName = overrides.categoryName ?? 'programming';
    const authorName = overrides.authorName ?? 'John Doe';

    return Book.fromPersistence({
      id,
      title: overrides.title ?? 'Test Book',
      authors: [Author.create({ id: validAuthorId, name: authorName })],
      description: 'A test book description',
      type: BookType.fromPersistence({ id: validTypeId, name: typeName }),
      categories: [Category.fromPersistence({ id: validCategoryId, name: categoryName, typeId: validTypeId })],
      format: 'pdf',
      isbn: '9780132350884',
      levelId: null,
      available: true,
      path: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  };

  const createSearchResult = (
    books: Book[],
    scores: (number | null)[] = [],
    hasNextPage = false,
    nextCursor: string | null = null,
    totalCount = books.length,
    levelNames: (string | null)[] = [],
  ): SearchBooksResult => ({
    items: books.map((book, index): BookWithScore => ({
      book,
      similarityScore: scores[index] ?? null,
      levelName: levelNames[index] ?? null,
    })),
    totalCount,
    hasNextPage,
    nextCursor,
  });

  beforeEach(() => {
    mockBookRepository = {
      search: vi.fn(),
      findById: vi.fn(),
      findByIsbn: vi.fn(),
      existsByIsbn: vi.fn(),
      checkDuplicate: vi.fn(),
      save: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findAll: vi.fn(),
      count: vi.fn(),
    };

    mockEmbeddingService = {
      generateEmbedding: vi.fn(),
      isAvailable: vi.fn(),
    };

    mockFavoriteRepository = {
      findByUserAndBook: vi.fn(),
      add: vi.fn(),
      remove: vi.fn(),
      findAllByUser: vi.fn(),
    };

    const deps: SearchBooksUseCaseDeps = {
      bookRepository: mockBookRepository as unknown as BookRepository,
      embeddingService: mockEmbeddingService as unknown as EmbeddingService,
    };

    useCase = new SearchBooksUseCase(deps);
  });

  describe('basic search without filters', () => {
    it('should return empty results when no books exist', async () => {
      mockBookRepository.search.mockResolvedValue(createSearchResult([]));

      const input: SearchBooksInput = {};
      const result = await useCase.execute(input);

      expect(result.items).toEqual([]);
      expect(result.pagination.totalCount).toBe(0);
      expect(result.pagination.hasNextPage).toBe(false);
      expect(mockBookRepository.search).toHaveBeenCalledTimes(1);
    });

    it('should return books ordered by title when no text filter', async () => {
      const book1 = createTestBook({ id: '11111111-1111-1111-1111-111111111111', title: 'Alpha Book' });
      const book2 = createTestBook({ id: '22222222-2222-2222-2222-222222222222', title: 'Beta Book' });

      mockBookRepository.search.mockResolvedValue(createSearchResult([book1, book2]));

      const input: SearchBooksInput = {};
      const result = await useCase.execute(input);

      expect(result.items).toHaveLength(2);
      expect(result.items[0]?.id).toBe(book1.id);
      expect(result.items[0]?.similarityScore).toBeNull();

      // Verify criteria passed to repository has order by title ASC
      const searchCall = mockBookRepository.search.mock.calls[0];
      expect(searchCall).toBeDefined();
      const criteria = searchCall[0];
      expect(criteria.order.orderBy.value).toBe('title');
      expect(criteria.order.orderType.isAsc()).toBe(true);
    });

    it('should use default limit of 50', async () => {
      mockBookRepository.search.mockResolvedValue(createSearchResult([]));

      const input: SearchBooksInput = {};
      await useCase.execute(input);

      const searchCall = mockBookRepository.search.mock.calls[0];
      const criteria = searchCall[0];
      expect(criteria.limit).toBe(50);
    });
  });

  describe('pagination', () => {
    it('should accept custom limit', async () => {
      mockBookRepository.search.mockResolvedValue(createSearchResult([]));

      const input: SearchBooksInput = { limit: 25 };
      await useCase.execute(input);

      const criteria = mockBookRepository.search.mock.calls[0]?.[0];
      expect(criteria.limit).toBe(25);
    });

    it('should pass cursor to repository', async () => {
      mockBookRepository.search.mockResolvedValue(createSearchResult([]));

      const input: SearchBooksInput = { cursor: 'abc123' };
      await useCase.execute(input);

      const criteria = mockBookRepository.search.mock.calls[0]?.[0];
      expect(criteria.cursor).toBe('abc123');
    });

    it('should return pagination metadata', async () => {
      const book = createTestBook();
      mockBookRepository.search.mockResolvedValue(
        createSearchResult([book], [], true, 'nextCursor123', 100),
      );

      const input: SearchBooksInput = { limit: 10 };
      const result = await useCase.execute(input);

      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.hasNextPage).toBe(true);
      expect(result.pagination.nextCursor).toBe('nextCursor123');
      expect(result.pagination.totalCount).toBe(100);
    });
  });

  describe('ISBN filter', () => {
    it('should apply ISBN filter with EQUALS operator', async () => {
      mockBookRepository.search.mockResolvedValue(createSearchResult([]));

      const input: SearchBooksInput = { isbn: '9780132350884' };
      await useCase.execute(input);

      const criteria = mockBookRepository.search.mock.calls[0]?.[0];
      expect(criteria.hasFilters()).toBe(true);
      expect(criteria.filters.hasField('isbn')).toBe(true);
    });
  });

  describe('title filter', () => {
    it('should apply title filter with CONTAINS operator', async () => {
      mockBookRepository.search.mockResolvedValue(createSearchResult([]));

      const input: SearchBooksInput = { title: 'Clean Code' };
      await useCase.execute(input);

      const criteria = mockBookRepository.search.mock.calls[0]?.[0];
      expect(criteria.hasFilters()).toBe(true);
      expect(criteria.filters.hasField('title')).toBe(true);

      const titleFilter = criteria.filters.getByField('title');
      expect(titleFilter.operator.value).toBe('CONTAINS');
    });
  });

  describe('author filter', () => {
    it('should apply author filter with CONTAINS operator', async () => {
      mockBookRepository.search.mockResolvedValue(createSearchResult([]));

      const input: SearchBooksInput = { author: 'Martin' };
      await useCase.execute(input);

      const criteria = mockBookRepository.search.mock.calls[0]?.[0];
      expect(criteria.filters.hasField('author')).toBe(true);

      const authorFilter = criteria.filters.getByField('author');
      expect(authorFilter.operator.value).toBe('CONTAINS');
    });
  });

  describe('types filter', () => {
    it('should apply types filter with IN operator', async () => {
      mockBookRepository.search.mockResolvedValue(createSearchResult([]));

      const input: SearchBooksInput = { types: ['technical', 'reference'] };
      await useCase.execute(input);

      const criteria = mockBookRepository.search.mock.calls[0]?.[0];
      expect(criteria.filters.hasField('type')).toBe(true);

      const typeFilter = criteria.filters.getByField('type');
      expect(typeFilter.operator.value).toBe('IN');
      expect(typeFilter.value.value).toEqual(['technical', 'reference']);
    });

    it('should skip empty types array', async () => {
      mockBookRepository.search.mockResolvedValue(createSearchResult([]));

      const input: SearchBooksInput = { types: [] };
      await useCase.execute(input);

      const criteria = mockBookRepository.search.mock.calls[0]?.[0];
      expect(criteria.filters.hasField('type')).toBe(false);
    });
  });

  describe('categories filter', () => {
    it('should apply categories filter with IN operator', async () => {
      mockBookRepository.search.mockResolvedValue(createSearchResult([]));

      const input: SearchBooksInput = { categories: ['programming', 'web'] };
      await useCase.execute(input);

      const criteria = mockBookRepository.search.mock.calls[0]?.[0];
      expect(criteria.filters.hasField('categories')).toBe(true);

      const categoryFilter = criteria.filters.getByField('categories');
      expect(categoryFilter.operator.value).toBe('IN');
    });
  });

  describe('levels filter', () => {
    it('should apply levels filter with IN operator', async () => {
      mockBookRepository.search.mockResolvedValue(createSearchResult([]));

      const input: SearchBooksInput = { levels: ['beginner', 'intermediate'] };
      await useCase.execute(input);

      const criteria = mockBookRepository.search.mock.calls[0]?.[0];
      expect(criteria.filters.hasField('levels')).toBe(true);

      const levelFilter = criteria.filters.getByField('levels');
      expect(levelFilter.operator.value).toBe('IN');
    });
  });

  describe('text filter (semantic search)', () => {
    it('should generate embedding and apply SIMILAR_TO filter', async () => {
      const embedding = Array(768).fill(0.1);
      mockEmbeddingService.generateEmbedding.mockResolvedValue({
        embedding,
        model: 'nomic-embed-text',
      });
      mockBookRepository.search.mockResolvedValue(createSearchResult([]));

      const input: SearchBooksInput = { text: 'best practices for software development' };
      await useCase.execute(input);

      expect(mockEmbeddingService.generateEmbedding).toHaveBeenCalledWith(
        'best practices for software development',
      );

      const [criteria, passedEmbedding] = mockBookRepository.search.mock.calls[0] ?? [];
      expect(criteria.hasSimilarityFilter()).toBe(true);
      expect(passedEmbedding).toEqual(embedding);
    });

    it('should order by similarity score descending when text filter is present', async () => {
      const embedding = Array(768).fill(0.1);
      mockEmbeddingService.generateEmbedding.mockResolvedValue({
        embedding,
        model: 'nomic-embed-text',
      });
      mockBookRepository.search.mockResolvedValue(createSearchResult([]));

      const input: SearchBooksInput = { text: 'clean code principles' };
      await useCase.execute(input);

      const criteria = mockBookRepository.search.mock.calls[0]?.[0];
      expect(criteria.order.orderBy.value).toBe('similarity');
      expect(criteria.order.orderType.isDesc()).toBe(true);
    });

    it('should include similarity score in results', async () => {
      const embedding = Array(768).fill(0.1);
      mockEmbeddingService.generateEmbedding.mockResolvedValue({
        embedding,
        model: 'nomic-embed-text',
      });

      const book = createTestBook();
      mockBookRepository.search.mockResolvedValue(
        createSearchResult([book], [0.87]),
      );

      const input: SearchBooksInput = { text: 'software architecture' };
      const result = await useCase.execute(input);

      expect(result.items[0]?.similarityScore).toBe(0.87);
    });

    it('should throw EmbeddingServiceUnavailableError when embedding service fails', async () => {
      mockEmbeddingService.generateEmbedding.mockRejectedValue(
        new EmbeddingServiceUnavailableError('Service unavailable'),
      );

      const input: SearchBooksInput = { text: 'test query' };

      await expect(useCase.execute(input)).rejects.toThrow(EmbeddingServiceUnavailableError);
      expect(mockBookRepository.search).not.toHaveBeenCalled();
    });
  });

  describe('combined filters', () => {
    it('should combine multiple filters with AND logic', async () => {
      mockBookRepository.search.mockResolvedValue(createSearchResult([]));

      const input: SearchBooksInput = {
        types: ['technical'],
        author: 'Martin',
        title: 'Clean',
      };
      await useCase.execute(input);

      const criteria = mockBookRepository.search.mock.calls[0]?.[0];
      expect(criteria.filters.count()).toBe(3);
      expect(criteria.filters.hasField('type')).toBe(true);
      expect(criteria.filters.hasField('author')).toBe(true);
      expect(criteria.filters.hasField('title')).toBe(true);
    });
  });

  describe('output mapping', () => {
    it('should map book entity to output DTO correctly', async () => {
      const book = createTestBook({
        id: validUUID,
        title: 'Clean Code',
        authorName: 'Robert C. Martin',
        typeName: 'technical',
        categoryName: 'programming',
      });

      mockBookRepository.search.mockResolvedValue(createSearchResult([book]));

      const result = await useCase.execute({});

      const item = result.items[0];
      expect(item).toBeDefined();
      expect(item?.id).toBe(validUUID);
      expect(item?.title).toBe('Clean Code');
      expect(item?.authors).toHaveLength(1);
      expect(item?.authors[0]?.name).toBe('Robert C. Martin');
      expect(item?.type).toBe('technical');
      expect(item?.categories).toHaveLength(1);
      expect(item?.categories[0]?.name).toBe('programming');
      expect(item?.format).toBe('pdf');
      expect(item?.isbn).toBe('9780132350884');
      expect(item?.similarityScore).toBeNull();
      expect(item?.level).toBeNull();
    });

    it('should include level name from repository result', async () => {
      const book = createTestBook();
      mockBookRepository.search.mockResolvedValue(
        createSearchResult([book], [], false, null, 1, ['Beginner']),
      );

      const result = await useCase.execute({});

      expect(result.items[0]?.level).toBe('Beginner');
    });

    it('should include description in output', async () => {
      const book = createTestBook();
      mockBookRepository.search.mockResolvedValue(createSearchResult([book]));

      const result = await useCase.execute({});

      expect(result.items[0]?.description).toBe('A test book description');
    });
  });

  describe('favoritesOf filter', () => {
    const userId = UserId.fromPersistence('550e8400-e29b-41d4-a716-446655440099');

    it('should return only favorited books when favoritesOf is provided', async () => {
      const book1 = createTestBook({ id: '11111111-1111-1111-1111-111111111111', title: 'Favorite Book' });
      const book2 = createTestBook({ id: '22222222-2222-2222-2222-222222222222', title: 'Other Book' });
      const favoriteBookId = BookId.fromPersistence('11111111-1111-1111-1111-111111111111');

      const useCaseWithFavorites = new SearchBooksUseCase({
        bookRepository: mockBookRepository as unknown as BookRepository,
        embeddingService: mockEmbeddingService as unknown as EmbeddingService,
        favoriteRepository: mockFavoriteRepository,
      });

      vi.mocked(mockFavoriteRepository.findAllByUser).mockResolvedValue([favoriteBookId]);
      mockBookRepository.search.mockResolvedValue(createSearchResult([book1, book2]));

      const result = await useCaseWithFavorites.execute({ favoritesOf: userId });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.id).toBe('11111111-1111-1111-1111-111111111111');
    });

    it('should return empty list when user has no favorites', async () => {
      const book1 = createTestBook({ id: '11111111-1111-1111-1111-111111111111' });

      const useCaseWithFavorites = new SearchBooksUseCase({
        bookRepository: mockBookRepository as unknown as BookRepository,
        embeddingService: mockEmbeddingService as unknown as EmbeddingService,
        favoriteRepository: mockFavoriteRepository,
      });

      vi.mocked(mockFavoriteRepository.findAllByUser).mockResolvedValue([]);
      mockBookRepository.search.mockResolvedValue(createSearchResult([book1]));

      const result = await useCaseWithFavorites.execute({ favoritesOf: userId });

      expect(result.items).toHaveLength(0);
      expect(result.pagination.totalCount).toBe(0);
    });

    it('should not call favoriteRepository when favoritesOf is not provided', async () => {
      const useCaseWithFavorites = new SearchBooksUseCase({
        bookRepository: mockBookRepository as unknown as BookRepository,
        embeddingService: mockEmbeddingService as unknown as EmbeddingService,
        favoriteRepository: mockFavoriteRepository,
      });

      mockBookRepository.search.mockResolvedValue(createSearchResult([]));

      await useCaseWithFavorites.execute({});

      expect(mockFavoriteRepository.findAllByUser).not.toHaveBeenCalled();
    });

    it('should preserve normal behavior when favoritesOf is undefined', async () => {
      const book = createTestBook({ id: '11111111-1111-1111-1111-111111111111' });
      mockBookRepository.search.mockResolvedValue(createSearchResult([book]));

      const result = await useCase.execute({});

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.id).toBe('11111111-1111-1111-1111-111111111111');
    });

    it('should call findAllByUser with the correct userId', async () => {
      const useCaseWithFavorites = new SearchBooksUseCase({
        bookRepository: mockBookRepository as unknown as BookRepository,
        embeddingService: mockEmbeddingService as unknown as EmbeddingService,
        favoriteRepository: mockFavoriteRepository,
      });

      vi.mocked(mockFavoriteRepository.findAllByUser).mockResolvedValue([]);
      mockBookRepository.search.mockResolvedValue(createSearchResult([]));

      await useCaseWithFavorites.execute({ favoritesOf: userId });

      expect(mockFavoriteRepository.findAllByUser).toHaveBeenCalledWith(userId);
    });
  });
});
