import { TestBed } from '@angular/core/testing';
import { of, throwError, delay } from 'rxjs';

import { BookSearchStore } from './book-search.store.js';
import { BookService } from './book.service.js';
import {
import { provideZonelessChangeDetection } from '@angular/core';
  Book,
  BookSearchResponse,
  BookTypeListResponse,
  CategoryListResponse,
  BookLevelListResponse,
  SearchFilters,
} from '../models/index.js';

describe('BookSearchStore', () => {
  let store: BookSearchStore;
  let bookServiceMock: {
    searchBooks: ReturnType<typeof vi.fn>;
    getBookTypes: ReturnType<typeof vi.fn>;
    getCategories: ReturnType<typeof vi.fn>;
    getLevels: ReturnType<typeof vi.fn>;
  };

  const mockBook: Book = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    isbn: '9780132350884',
    title: 'Clean Code',
    authors: [{ id: '990e8400-e29b-41d4-a716-446655440004', name: 'Robert C. Martin' }],
    type: 'technical',
    categories: [{ id: '660e8400-e29b-41d4-a716-446655440001', name: 'programming' }],
    level: 'Intermediate',
    format: 'pdf',
    originalDescription: 'A handbook of agile software craftsmanship',
    description: 'Un manual de artesanía de software ágil',
    language: 'en',
    available: true,
    similarityScore: null,
  };

  const mockSearchResponse: BookSearchResponse = {
    success: true,
    data: {
      items: [mockBook],
      pagination: {
        limit: 50,
        hasNextPage: true,
        nextCursor: 'abc123',
        totalCount: 100,
      },
    },
    error: null,
  };

  const mockTypesResponse: BookTypeListResponse = {
    success: true,
    data: [
      { id: '1', name: 'technical' },
      { id: '2', name: 'fiction' },
    ],
    error: null,
  };

  const mockCategoriesResponse: CategoryListResponse = {
    success: true,
    data: [
      { id: '1', name: 'programming', typeId: '1', description: null },
      { id: '2', name: 'databases', typeId: '1', description: null },
    ],
    error: null,
  };

  const mockLevelsResponse: BookLevelListResponse = {
    success: true,
    data: [
      { id: '1', name: 'Beginner' },
      { id: '2', name: 'Intermediate' },
    ],
    error: null,
  };

  beforeEach(() => {
    bookServiceMock = {
      searchBooks: vi.fn(),
      getBookTypes: vi.fn(),
      getCategories: vi.fn(),
      getLevels: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), BookSearchStore, { provide: BookService, useValue: bookServiceMock }],
    });

    store = TestBed.inject(BookSearchStore);
  });

  describe('Store Creation', () => {
    it('should be created', () => {
      expect(store).toBeTruthy();
    });

    it('should have initial state', () => {
      expect(store.books()).toEqual([]);
      expect(store.loading()).toBe(false);
      expect(store.error()).toBeNull();
      expect(store.pagination()).toEqual({
        limit: 50,
        hasNextPage: false,
        nextCursor: null,
        totalCount: 0,
      });
      expect(store.filters()).toEqual({});
      expect(store.types()).toEqual([]);
      expect(store.categories()).toEqual([]);
      expect(store.levels()).toEqual([]);
    });

    it('should have initial loading states for options', () => {
      expect(store.typesLoading()).toBe(false);
      expect(store.categoriesLoading()).toBe(false);
      expect(store.levelsLoading()).toBe(false);
    });
  });

  describe('searchBooks', () => {
    it('should set loading to true when searching', async () => {
      bookServiceMock.searchBooks.mockReturnValue(of(mockSearchResponse).pipe(delay(10)));

      store.searchBooks();
      expect(store.loading()).toBe(true);

      await vi.waitFor(() => expect(store.loading()).toBe(false), { timeout: 100 });
    });

    it('should update books with search results', async () => {
      bookServiceMock.searchBooks.mockReturnValue(of(mockSearchResponse));

      store.searchBooks();
      await vi.waitFor(() => expect(store.books()).toEqual([mockBook]));
    });

    it('should update pagination with search results', async () => {
      bookServiceMock.searchBooks.mockReturnValue(of(mockSearchResponse));

      store.searchBooks();
      await vi.waitFor(() =>
        expect(store.pagination()).toEqual({
          limit: 50,
          hasNextPage: true,
          nextCursor: 'abc123',
          totalCount: 100,
        })
      );
    });

    it('should call BookService with current filters', async () => {
      bookServiceMock.searchBooks.mockReturnValue(of(mockSearchResponse));

      const filters: SearchFilters = { title: 'Clean' };
      store.setFilters(filters);
      store.searchBooks();
      await vi.waitFor(() =>
        expect(bookServiceMock.searchBooks).toHaveBeenCalledWith(filters, { limit: 50 })
      );
    });

    it('should set error when search fails', async () => {
      const errorResponse: BookSearchResponse = {
        success: false,
        data: null,
        error: { message: 'Search failed' },
      };
      bookServiceMock.searchBooks.mockReturnValue(of(errorResponse));

      store.searchBooks();
      await vi.waitFor(() => {
        expect(store.error()).toBe('Search failed');
        expect(store.books()).toEqual([]);
      });
    });

    it('should set error when http request fails', async () => {
      bookServiceMock.searchBooks.mockReturnValue(throwError(() => new Error('Network error')));

      store.searchBooks();
      await vi.waitFor(() => expect(store.error()).toBe('Network error'));
    });

    it('should clear error on successful search', async () => {
      // First, set an error
      bookServiceMock.searchBooks.mockReturnValue(throwError(() => new Error('Network error')));
      store.searchBooks();
      await vi.waitFor(() => expect(store.error()).toBe('Network error'));

      // Then, successful search should clear error
      bookServiceMock.searchBooks.mockReturnValue(of(mockSearchResponse));
      store.searchBooks();
      await vi.waitFor(() => expect(store.error()).toBeNull());
    });
  });

  describe('setFilters', () => {
    it('should update filters', () => {
      const filters: SearchFilters = { title: 'Clean', author: 'Martin' };

      store.setFilters(filters);

      expect(store.filters()).toEqual(filters);
    });

    it('should reset pagination cursor when filters change', async () => {
      bookServiceMock.searchBooks.mockReturnValue(of(mockSearchResponse));

      // First search to get a cursor
      store.searchBooks();
      await vi.waitFor(() => expect(store.pagination().nextCursor).toBe('abc123'));

      // Update filters - should trigger a new search and reset cursor
      store.setFilters({ title: 'New Title' });

      expect(store.pagination().nextCursor).toBeNull();
    });
  });

  describe('loadNextPage', () => {
    it('should load next page with cursor', async () => {
      // First search
      bookServiceMock.searchBooks.mockReturnValue(of(mockSearchResponse));
      store.searchBooks();
      await vi.waitFor(() => expect(store.pagination().nextCursor).toBe('abc123'));

      // Load next page
      const nextPageResponse: BookSearchResponse = {
        success: true,
        data: {
          items: [{ ...mockBook, id: 'book-2', title: 'Clean Architecture' }],
          pagination: { limit: 50, hasNextPage: false, nextCursor: null, totalCount: 100 },
        },
        error: null,
      };
      bookServiceMock.searchBooks.mockReturnValue(of(nextPageResponse));

      store.loadNextPage();
      await vi.waitFor(() =>
        expect(bookServiceMock.searchBooks).toHaveBeenCalledWith(
          {},
          { limit: 50, cursor: 'abc123' }
        )
      );
    });

    it('should append books when loading next page', async () => {
      // First search
      bookServiceMock.searchBooks.mockReturnValue(of(mockSearchResponse));
      store.searchBooks();
      await vi.waitFor(() => expect(store.books().length).toBe(1));

      // Load next page
      const nextPageResponse: BookSearchResponse = {
        success: true,
        data: {
          items: [{ ...mockBook, id: 'book-2', title: 'Clean Architecture' }],
          pagination: { limit: 50, hasNextPage: false, nextCursor: null, totalCount: 100 },
        },
        error: null,
      };
      bookServiceMock.searchBooks.mockReturnValue(of(nextPageResponse));

      store.loadNextPage();
      await vi.waitFor(() => {
        expect(store.books().length).toBe(2);
        expect(store.books()[0].title).toBe('Clean Code');
        expect(store.books()[1].title).toBe('Clean Architecture');
      });
    });

    it('should not load next page if hasNextPage is false', async () => {
      const noMorePagesResponse: BookSearchResponse = {
        success: true,
        data: {
          items: [mockBook],
          pagination: { limit: 50, hasNextPage: false, nextCursor: null, totalCount: 1 },
        },
        error: null,
      };
      bookServiceMock.searchBooks.mockReturnValue(of(noMorePagesResponse));

      store.searchBooks();
      await vi.waitFor(() => expect(store.books().length).toBe(1));
      bookServiceMock.searchBooks.mockClear();

      store.loadNextPage();
      await vi.waitFor(() => expect(bookServiceMock.searchBooks).not.toHaveBeenCalled(), {
        timeout: 100,
      });
    });

    it('should set error and stop loading when loadNextPage http request errors', async () => {
      // First search to get a cursor
      bookServiceMock.searchBooks.mockReturnValue(of(mockSearchResponse));
      store.searchBooks();
      await vi.waitFor(() => expect(store.pagination().nextCursor).toBe('abc123'));

      // Load next page with error
      bookServiceMock.searchBooks.mockReturnValue(throwError(() => new Error('Network error')));
      store.loadNextPage();

      await vi.waitFor(() => {
        expect(store.loading()).toBe(false);
        expect(store.error()).toBe('Network error');
      });
    });

    it('should set error when loadNextPage response is not successful', async () => {
      // First search to get a cursor
      bookServiceMock.searchBooks.mockReturnValue(of(mockSearchResponse));
      store.searchBooks();
      await vi.waitFor(() => expect(store.pagination().nextCursor).toBe('abc123'));

      // Load next page with failure response
      const failureResponse: BookSearchResponse = {
        success: false,
        data: null,
        error: { message: 'Page load failed' },
      };
      bookServiceMock.searchBooks.mockReturnValue(of(failureResponse));
      store.loadNextPage();

      await vi.waitFor(() => {
        expect(store.loading()).toBe(false);
        expect(store.error()).toBe('Page load failed');
      });
    });
  });

  describe('setPageSize', () => {
    it('should update limit in pagination', async () => {
      // Mock response with the new page size
      const responseWithNewLimit: BookSearchResponse = {
        success: true,
        data: {
          items: [mockBook],
          pagination: {
            limit: 25,
            hasNextPage: true,
            nextCursor: 'abc123',
            totalCount: 100,
          },
        },
        error: null,
      };
      bookServiceMock.searchBooks.mockReturnValue(of(responseWithNewLimit));

      store.setPageSize(25);
      await vi.waitFor(() => expect(store.pagination().limit).toBe(25));
    });

    it('should trigger new search with new page size', async () => {
      bookServiceMock.searchBooks.mockReturnValue(of(mockSearchResponse));

      store.setPageSize(25);
      await vi.waitFor(() =>
        expect(bookServiceMock.searchBooks).toHaveBeenCalledWith({}, { limit: 25 })
      );
    });
  });

  describe('loadTypes', () => {
    it('should set typesLoading to true while loading', async () => {
      bookServiceMock.getBookTypes.mockReturnValue(of(mockTypesResponse).pipe(delay(10)));

      store.loadTypes();
      expect(store.typesLoading()).toBe(true);

      await vi.waitFor(() => expect(store.typesLoading()).toBe(false), { timeout: 100 });
    });

    it('should update types with response data', async () => {
      bookServiceMock.getBookTypes.mockReturnValue(of(mockTypesResponse));

      store.loadTypes();
      await vi.waitFor(() =>
        expect(store.types()).toEqual([
          { id: '1', name: 'technical' },
          { id: '2', name: 'fiction' },
        ])
      );
    });

    it('should set typesLoading to false when http request errors', async () => {
      bookServiceMock.getBookTypes.mockReturnValue(throwError(() => new Error('Network error')));

      store.loadTypes();

      await vi.waitFor(() => expect(store.typesLoading()).toBe(false));
    });
  });

  describe('loadCategories', () => {
    it('should set categoriesLoading to true while loading', async () => {
      bookServiceMock.getCategories.mockReturnValue(of(mockCategoriesResponse).pipe(delay(10)));

      store.loadCategories('technical');
      expect(store.categoriesLoading()).toBe(true);

      await vi.waitFor(() => expect(store.categoriesLoading()).toBe(false), { timeout: 100 });
    });

    it('should call BookService.getCategories with type', async () => {
      bookServiceMock.getCategories.mockReturnValue(of(mockCategoriesResponse));

      store.loadCategories('technical');
      await vi.waitFor(() =>
        expect(bookServiceMock.getCategories).toHaveBeenCalledWith('technical')
      );
    });

    it('should update categories with response data', async () => {
      bookServiceMock.getCategories.mockReturnValue(of(mockCategoriesResponse));

      store.loadCategories('technical');
      await vi.waitFor(() => {
        expect(store.categories().length).toBe(2);
        expect(store.categories()[0].name).toBe('programming');
      });
    });

    it('should clear categories when called without type', async () => {
      bookServiceMock.getCategories.mockReturnValue(of(mockCategoriesResponse));

      // First load some categories
      store.loadCategories('technical');
      await vi.waitFor(() => expect(store.categories().length).toBe(2));

      // Clear categories
      store.loadCategories('');
      await vi.waitFor(() => expect(store.categories()).toEqual([]));
    });

    it('should set categoriesLoading to false when http request errors', async () => {
      bookServiceMock.getCategories.mockReturnValue(throwError(() => new Error('Network error')));

      store.loadCategories('technical');

      await vi.waitFor(() => expect(store.categoriesLoading()).toBe(false));
    });
  });

  describe('loadLevels', () => {
    it('should set levelsLoading to true while loading', async () => {
      bookServiceMock.getLevels.mockReturnValue(of(mockLevelsResponse).pipe(delay(10)));

      store.loadLevels('technical');
      expect(store.levelsLoading()).toBe(true);

      await vi.waitFor(() => expect(store.levelsLoading()).toBe(false), { timeout: 100 });
    });

    it('should call BookService.getLevels with type', async () => {
      bookServiceMock.getLevels.mockReturnValue(of(mockLevelsResponse));

      store.loadLevels('technical');
      await vi.waitFor(() => expect(bookServiceMock.getLevels).toHaveBeenCalledWith('technical'));
    });

    it('should update levels with response data', async () => {
      bookServiceMock.getLevels.mockReturnValue(of(mockLevelsResponse));

      store.loadLevels('technical');
      await vi.waitFor(() => {
        expect(store.levels().length).toBe(2);
        expect(store.levels()[0].name).toBe('Beginner');
      });
    });

    it('should clear levels when called without type', async () => {
      bookServiceMock.getLevels.mockReturnValue(of(mockLevelsResponse));

      // First load some levels
      store.loadLevels('technical');
      await vi.waitFor(() => expect(store.levels().length).toBe(2));

      // Clear levels
      store.loadLevels('');
      await vi.waitFor(() => expect(store.levels()).toEqual([]));
    });

    it('should set levelsLoading to false when http request errors', async () => {
      bookServiceMock.getLevels.mockReturnValue(throwError(() => new Error('Network error')));

      store.loadLevels('technical');

      await vi.waitFor(() => expect(store.levelsLoading()).toBe(false));
    });
  });

  describe('reset', () => {
    it('should reset all state to initial values', async () => {
      // First, populate some state
      bookServiceMock.searchBooks.mockReturnValue(of(mockSearchResponse));
      bookServiceMock.getBookTypes.mockReturnValue(of(mockTypesResponse));

      store.setFilters({ title: 'Clean' });
      store.searchBooks();
      store.loadTypes();
      await vi.waitFor(() => expect(store.books().length).toBe(1));

      // Now reset
      store.reset();

      expect(store.books()).toEqual([]);
      expect(store.filters()).toEqual({});
      expect(store.error()).toBeNull();
      expect(store.pagination()).toEqual({
        limit: 50,
        hasNextPage: false,
        nextCursor: null,
        totalCount: 0,
      });
    });
  });

  describe('computed properties', () => {
    it('isEmpty should return true when no books', () => {
      expect(store.isEmpty()).toBe(true);
    });

    it('isEmpty should return false when there are books', async () => {
      bookServiceMock.searchBooks.mockReturnValue(of(mockSearchResponse));

      store.searchBooks();
      await vi.waitFor(() => expect(store.isEmpty()).toBe(false));
    });

    it('hasFilters should return false initially', () => {
      expect(store.hasFilters()).toBe(false);
    });

    it('hasFilters should return true when filters are set', () => {
      store.setFilters({ title: 'Test' });

      expect(store.hasFilters()).toBe(true);
    });

    it('hasFilters should return false for empty filter values', () => {
      store.setFilters({ title: '', categories: [] });

      expect(store.hasFilters()).toBe(false);
    });
  });
});
