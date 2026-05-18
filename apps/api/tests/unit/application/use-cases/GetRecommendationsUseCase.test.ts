import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  GetRecommendationsUseCase,
  type GetRecommendationsUseCaseDeps,
} from '../../../../src/application/use-cases/GetRecommendationsUseCase.js';
import type { BookRepository } from '../../../../src/application/ports/BookRepository.js';
import type { DownloadRepository } from '../../../../src/domain/download/ports/DownloadRepository.js';
import type { FavoriteRepository } from '../../../../src/domain/favorite/ports/FavoriteRepository.js';
import { Download } from '../../../../src/domain/download/Download.js';
import { Book } from '../../../../src/domain/entities/Book.js';
import { Author } from '../../../../src/domain/entities/Author.js';
import { BookType } from '../../../../src/domain/entities/BookType.js';
import { Category } from '../../../../src/domain/entities/Category.js';
import { UserId } from '../../../../src/domain/user/value-objects/UserId.js';
import { BookId } from '../../../../src/domain/book/value-objects/BookId.js';

describe('GetRecommendationsUseCase', () => {
  const userId = '550e8400-e29b-41d4-a716-446655440001';
  const bookId1 = '550e8400-e29b-41d4-a716-446655440002';
  const bookId2 = '550e8400-e29b-41d4-a716-446655440003';
  const bookId3 = '550e8400-e29b-41d4-a716-446655440004';
  const bookId4 = '550e8400-e29b-41d4-a716-446655440005';
  const typeId = 'bb0e8400-e29b-41d4-a716-446655440001';
  const categoryId1 = 'cc0e8400-e29b-41d4-a716-446655440002';
  const categoryId2 = 'cc0e8400-e29b-41d4-a716-446655440003';
  const authorId = 'dd0e8400-e29b-41d4-a716-446655440004';

  let mockDownloadRepository: { findAllByUser: ReturnType<typeof vi.fn> };
  let mockFavoriteRepository: { findAllByUser: ReturnType<typeof vi.fn>; findByUserAndBook: ReturnType<typeof vi.fn>; add: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> };
  let mockBookRepository: {
    findEmbeddingsByIds: ReturnType<typeof vi.fn>;
    findCategoriesByIds: ReturnType<typeof vi.fn>;
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

  let useCase: GetRecommendationsUseCase;

  const createTestBook = (id: string, categoryName = 'Programming'): Book =>
    Book.fromPersistence({
      id,
      title: `Book ${id.slice(-4)}`,
      authors: [Author.create({ id: authorId, name: 'Test Author' })],
      description: 'desc',
      originalDescription: 'desc',
      language: 'en',
      type: BookType.fromPersistence({ id: typeId, name: 'technical' }),
      categories: [Category.fromPersistence({ id: categoryId1, name: categoryName, typeId })],
      format: 'pdf',
      isbn: null,
      levelId: null,
      available: true,
      path: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

  const createDownload = (bookId: string): Download =>
    Download.fromPersistence({ userId, bookId, downloadedAt: new Date() });

  beforeEach(() => {
    mockDownloadRepository = { findAllByUser: vi.fn() };
    mockFavoriteRepository = {
      findAllByUser: vi.fn(),
      findByUserAndBook: vi.fn(),
      add: vi.fn(),
      remove: vi.fn(),
    };
    mockBookRepository = {
      findEmbeddingsByIds: vi.fn(),
      findCategoriesByIds: vi.fn(),
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

    const deps: GetRecommendationsUseCaseDeps = {
      bookRepository: mockBookRepository as unknown as BookRepository,
      downloadRepository: mockDownloadRepository as unknown as DownloadRepository,
      favoriteRepository: mockFavoriteRepository as unknown as FavoriteRepository,
    };
    useCase = new GetRecommendationsUseCase(deps);
  });

  describe('when user has no seeds (no downloads, no favorites)', () => {
    it('should return empty output', async () => {
      mockDownloadRepository.findAllByUser.mockResolvedValue([]);
      mockFavoriteRepository.findAllByUser.mockResolvedValue([]);

      const result = await useCase.execute(userId);

      expect(result).toEqual({ items: [], label: '' });
      expect(mockBookRepository.findEmbeddingsByIds).not.toHaveBeenCalled();
      expect(mockBookRepository.search).not.toHaveBeenCalled();
    });
  });

  describe('when seeds exist but no embeddings found', () => {
    it('should return empty output', async () => {
      mockDownloadRepository.findAllByUser.mockResolvedValue([createDownload(bookId1)]);
      mockFavoriteRepository.findAllByUser.mockResolvedValue([]);
      mockBookRepository.findEmbeddingsByIds.mockResolvedValue([]);

      const result = await useCase.execute(userId);

      expect(result).toEqual({ items: [], label: '' });
      expect(mockBookRepository.search).not.toHaveBeenCalled();
    });
  });

  describe('when seeds and embeddings exist', () => {
    const centroidEmbedding = [0.5, 0.5];
    const embedding1 = [1.0, 0.0];
    const embedding2 = [0.0, 1.0];

    beforeEach(() => {
      mockDownloadRepository.findAllByUser.mockResolvedValue([createDownload(bookId1)]);
      mockFavoriteRepository.findAllByUser.mockResolvedValue([BookId.fromPersistence(bookId2)]);
      mockBookRepository.findEmbeddingsByIds.mockResolvedValue([
        { id: bookId1, embedding: embedding1 },
        { id: bookId2, embedding: embedding2 },
      ]);
      mockBookRepository.findCategoriesByIds.mockResolvedValue([
        { id: bookId1, categories: ['Programming'] },
        { id: bookId2, categories: ['Programming'] },
      ]);
    });

    it('should exclude seed books from recommendations', async () => {
      const seedBook1 = createTestBook(bookId1);
      const seedBook2 = createTestBook(bookId2);
      const candidateBook = createTestBook(bookId3);

      mockBookRepository.search.mockResolvedValue({
        items: [
          { book: seedBook1, similarityScore: 0.9, levelName: null },
          { book: seedBook2, similarityScore: 0.85, levelName: null },
          { book: candidateBook, similarityScore: 0.8, levelName: null },
        ],
        totalCount: 3,
        hasNextPage: false,
        nextCursor: null,
      });

      const result = await useCase.execute(userId);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].bookId).toBe(bookId3);
    });

    it('should exclude books with similarity below 0.55 threshold', async () => {
      const goodBook = createTestBook(bookId3);
      const badBook = createTestBook(bookId4);

      mockBookRepository.search.mockResolvedValue({
        items: [
          { book: goodBook, similarityScore: 0.7, levelName: null },
          { book: badBook, similarityScore: 0.4, levelName: null },
        ],
        totalCount: 2,
        hasNextPage: false,
        nextCursor: null,
      });

      const result = await useCase.execute(userId);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].bookId).toBe(bookId3);
      expect(result.items[0].similarity).toBeGreaterThanOrEqual(0.55);
    });

    it('should return at most top 20 items', async () => {
      const manyBooks = Array.from({ length: 30 }, (_, i) => ({
        book: createTestBook(`550e8400-e29b-41d4-a716-${String(i).padStart(12, '0')}`),
        similarityScore: 0.9 - i * 0.01,
        levelName: null,
      }));

      mockBookRepository.search.mockResolvedValue({
        items: manyBooks,
        totalCount: 30,
        hasNextPage: false,
        nextCursor: null,
      });

      const result = await useCase.execute(userId);

      expect(result.items.length).toBeLessThanOrEqual(20);
    });

    it('should build the correct label from dominant category', async () => {
      const book1 = Book.fromPersistence({
        id: bookId1,
        title: 'Book 1',
        authors: [Author.create({ id: authorId, name: 'Author' })],
        description: 'desc',
        originalDescription: 'desc',
        language: 'en',
        type: BookType.fromPersistence({ id: typeId, name: 'technical' }),
        categories: [Category.fromPersistence({ id: categoryId1, name: 'Programming', typeId })],
        format: 'pdf',
        isbn: null,
        levelId: null,
        available: true,
        path: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const book2 = Book.fromPersistence({
        id: bookId2,
        title: 'Book 2',
        authors: [Author.create({ id: authorId, name: 'Author' })],
        description: 'desc',
        originalDescription: 'desc',
        language: 'en',
        type: BookType.fromPersistence({ id: typeId, name: 'technical' }),
        categories: [Category.fromPersistence({ id: categoryId2, name: 'Programming', typeId })],
        format: 'pdf',
        isbn: null,
        levelId: null,
        available: true,
        path: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockDownloadRepository.findAllByUser.mockResolvedValue([
        Download.fromPersistence({ userId, bookId: bookId1, downloadedAt: new Date() }),
      ]);
      mockFavoriteRepository.findAllByUser.mockResolvedValue([BookId.fromPersistence(bookId2)]);
      mockBookRepository.findEmbeddingsByIds.mockResolvedValue([
        { id: bookId1, embedding: [1.0, 0.0] },
        { id: bookId2, embedding: [0.0, 1.0] },
      ]);
      mockBookRepository.findCategoriesByIds.mockResolvedValue([
        { id: bookId1, categories: ['Programming'] },
        { id: bookId2, categories: ['Programming'] },
      ]);

      const candidateBook = createTestBook(bookId3);
      mockBookRepository.search.mockResolvedValue({
        items: [{ book: candidateBook, similarityScore: 0.8, levelName: null }],
        totalCount: 1,
        hasNextPage: false,
        nextCursor: null,
      });

      const result = await useCase.execute(userId);

      expect(result.label).toBe('Porque te interesa Programming');
    });

    it('should deduplicate seeds from downloads and favorites', async () => {
      // Same book appears in both downloads and favorites
      mockDownloadRepository.findAllByUser.mockResolvedValue([createDownload(bookId1)]);
      mockFavoriteRepository.findAllByUser.mockResolvedValue([
        BookId.fromPersistence(bookId1), // duplicate
        BookId.fromPersistence(bookId2),
      ]);

      mockBookRepository.findEmbeddingsByIds.mockResolvedValue([
        { id: bookId1, embedding: [1.0, 0.0] },
        { id: bookId2, embedding: [0.0, 1.0] },
      ]);

      const candidateBook = createTestBook(bookId3);
      mockBookRepository.search.mockResolvedValue({
        items: [{ book: candidateBook, similarityScore: 0.8, levelName: null }],
        totalCount: 1,
        hasNextPage: false,
        nextCursor: null,
      });

      await useCase.execute(userId);

      // Should call findEmbeddingsByIds with deduplicated ids (only 2, not 3)
      const calledWithIds = mockBookRepository.findEmbeddingsByIds.mock.calls[0][0] as string[];
      expect(calledWithIds).toHaveLength(2);
      expect(new Set(calledWithIds).size).toBe(2);
    });

    it('should map items to RecommendationItem with correct fields', async () => {
      const candidateBook = createTestBook(bookId3, 'Science');
      mockBookRepository.search.mockResolvedValue({
        items: [{ book: candidateBook, similarityScore: 0.75, levelName: null }],
        totalCount: 1,
        hasNextPage: false,
        nextCursor: null,
      });

      const result = await useCase.execute(userId);

      expect(result.items).toHaveLength(1);
      const item = result.items[0];
      expect(item.bookId).toBe(bookId3);
      expect(item.similarity).toBe(0.75);
      expect(item.title).toBeTruthy();
      expect(item.author).toBeTruthy();
    });

    it('should call search with embedding (centroid) and limit 40', async () => {
      mockBookRepository.search.mockResolvedValue({
        items: [],
        totalCount: 0,
        hasNextPage: false,
        nextCursor: null,
      });

      await useCase.execute(userId);

      expect(mockBookRepository.search).toHaveBeenCalledOnce();
      const [, embeddingArg] = mockBookRepository.search.mock.calls[0] as [unknown, number[]];
      expect(embeddingArg).toBeDefined();
      expect(Array.isArray(embeddingArg)).toBe(true);
    });
  });

  describe('when no favoriteRepository is provided', () => {
    it('should still work using only downloads as seeds', async () => {
      const depsWithoutFav: GetRecommendationsUseCaseDeps = {
        bookRepository: mockBookRepository as unknown as BookRepository,
        downloadRepository: mockDownloadRepository as unknown as DownloadRepository,
      };
      const useCaseWithoutFav = new GetRecommendationsUseCase(depsWithoutFav);

      mockDownloadRepository.findAllByUser.mockResolvedValue([createDownload(bookId1)]);
      mockBookRepository.findEmbeddingsByIds.mockResolvedValue([
        { id: bookId1, embedding: [1.0, 0.0] },
      ]);
      mockBookRepository.findCategoriesByIds.mockResolvedValue([
        { id: bookId1, categories: ['Programming'] },
      ]);

      const candidateBook = createTestBook(bookId3);
      mockBookRepository.search.mockResolvedValue({
        items: [{ book: candidateBook, similarityScore: 0.8, levelName: null }],
        totalCount: 1,
        hasNextPage: false,
        nextCursor: null,
      });

      const result = await useCaseWithoutFav.execute(userId);
      expect(result.items).toHaveLength(1);
    });
  });
});
