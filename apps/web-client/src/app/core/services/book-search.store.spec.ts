import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { BookSearchStore } from './book-search.store.js';
import { BookService } from './book.service.js';
import {
  Book,
  BookSearchResponse,
  BookTypeListResponse,
  CategoryListResponse,
  BookLevelListResponse,
  SearchFilters,
} from '../models/index.js';

describe('BookSearchStore', () => {
  let store: BookSearchStore;
  let bookServiceSpy: jasmine.SpyObj<BookService>;

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
    const spy = jasmine.createSpyObj('BookService', [
      'searchBooks',
      'getBookTypes',
      'getCategories',
      'getLevels',
    ]);

    TestBed.configureTestingModule({
      providers: [BookSearchStore, { provide: BookService, useValue: spy }],
    });

    store = TestBed.inject(BookSearchStore);
    bookServiceSpy = TestBed.inject(BookService) as jasmine.SpyObj<BookService>;
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
    it('should set loading to true when searching', fakeAsync(() => {
      bookServiceSpy.searchBooks.and.returnValue(of(mockSearchResponse));

      store.searchBooks();
      expect(store.loading()).toBe(true);

      tick();
      expect(store.loading()).toBe(false);
    }));

    it('should update books with search results', fakeAsync(() => {
      bookServiceSpy.searchBooks.and.returnValue(of(mockSearchResponse));

      store.searchBooks();
      tick();

      expect(store.books()).toEqual([mockBook]);
    }));

    it('should update pagination with search results', fakeAsync(() => {
      bookServiceSpy.searchBooks.and.returnValue(of(mockSearchResponse));

      store.searchBooks();
      tick();

      expect(store.pagination()).toEqual({
        limit: 50,
        hasNextPage: true,
        nextCursor: 'abc123',
        totalCount: 100,
      });
    }));

    it('should call BookService with current filters', fakeAsync(() => {
      bookServiceSpy.searchBooks.and.returnValue(of(mockSearchResponse));

      const filters: SearchFilters = { title: 'Clean' };
      store.setFilters(filters);
      store.searchBooks();
      tick();

      expect(bookServiceSpy.searchBooks).toHaveBeenCalledWith(filters, { limit: 50 });
    }));

    it('should set error when search fails', fakeAsync(() => {
      const errorResponse: BookSearchResponse = {
        success: false,
        data: null,
        error: { message: 'Search failed' },
      };
      bookServiceSpy.searchBooks.and.returnValue(of(errorResponse));

      store.searchBooks();
      tick();

      expect(store.error()).toBe('Search failed');
      expect(store.books()).toEqual([]);
    }));

    it('should set error when http request fails', fakeAsync(() => {
      bookServiceSpy.searchBooks.and.returnValue(throwError(() => new Error('Network error')));

      store.searchBooks();
      tick();

      expect(store.error()).toBe('Network error');
    }));

    it('should clear error on successful search', fakeAsync(() => {
      // First, set an error
      bookServiceSpy.searchBooks.and.returnValue(throwError(() => new Error('Network error')));
      store.searchBooks();
      tick();
      expect(store.error()).toBe('Network error');

      // Then, successful search should clear error
      bookServiceSpy.searchBooks.and.returnValue(of(mockSearchResponse));
      store.searchBooks();
      tick();

      expect(store.error()).toBeNull();
    }));
  });

  describe('setFilters', () => {
    it('should update filters', () => {
      const filters: SearchFilters = { title: 'Clean', author: 'Martin' };

      store.setFilters(filters);

      expect(store.filters()).toEqual(filters);
    });

    it('should reset pagination cursor when filters change', fakeAsync(() => {
      bookServiceSpy.searchBooks.and.returnValue(of(mockSearchResponse));

      // First search to get a cursor
      store.searchBooks();
      tick();
      expect(store.pagination().nextCursor).toBe('abc123');

      // Update filters - should trigger a new search and reset cursor
      store.setFilters({ title: 'New Title' });

      expect(store.pagination().nextCursor).toBeNull();
    }));
  });

  describe('loadNextPage', () => {
    it('should load next page with cursor', fakeAsync(() => {
      // First search
      bookServiceSpy.searchBooks.and.returnValue(of(mockSearchResponse));
      store.searchBooks();
      tick();

      // Load next page
      const nextPageResponse: BookSearchResponse = {
        success: true,
        data: {
          items: [{ ...mockBook, id: 'book-2', title: 'Clean Architecture' }],
          pagination: { limit: 50, hasNextPage: false, nextCursor: null, totalCount: 100 },
        },
        error: null,
      };
      bookServiceSpy.searchBooks.and.returnValue(of(nextPageResponse));

      store.loadNextPage();
      tick();

      expect(bookServiceSpy.searchBooks).toHaveBeenCalledWith({}, { limit: 50, cursor: 'abc123' });
    }));

    it('should append books when loading next page', fakeAsync(() => {
      // First search
      bookServiceSpy.searchBooks.and.returnValue(of(mockSearchResponse));
      store.searchBooks();
      tick();

      // Load next page
      const nextPageResponse: BookSearchResponse = {
        success: true,
        data: {
          items: [{ ...mockBook, id: 'book-2', title: 'Clean Architecture' }],
          pagination: { limit: 50, hasNextPage: false, nextCursor: null, totalCount: 100 },
        },
        error: null,
      };
      bookServiceSpy.searchBooks.and.returnValue(of(nextPageResponse));

      store.loadNextPage();
      tick();

      expect(store.books().length).toBe(2);
      expect(store.books()[0].title).toBe('Clean Code');
      expect(store.books()[1].title).toBe('Clean Architecture');
    }));

    it('should not load next page if hasNextPage is false', fakeAsync(() => {
      const noMorePagesResponse: BookSearchResponse = {
        success: true,
        data: {
          items: [mockBook],
          pagination: { limit: 50, hasNextPage: false, nextCursor: null, totalCount: 1 },
        },
        error: null,
      };
      bookServiceSpy.searchBooks.and.returnValue(of(noMorePagesResponse));

      store.searchBooks();
      tick();
      bookServiceSpy.searchBooks.calls.reset();

      store.loadNextPage();
      tick();

      expect(bookServiceSpy.searchBooks).not.toHaveBeenCalled();
    }));
  });

  describe('setPageSize', () => {
    it('should update limit in pagination', () => {
      store.setPageSize(25);

      expect(store.pagination().limit).toBe(25);
    });

    it('should trigger new search with new page size', fakeAsync(() => {
      bookServiceSpy.searchBooks.and.returnValue(of(mockSearchResponse));

      store.setPageSize(25);
      tick();

      expect(bookServiceSpy.searchBooks).toHaveBeenCalledWith({}, { limit: 25 });
    }));
  });

  describe('loadTypes', () => {
    it('should set typesLoading to true while loading', fakeAsync(() => {
      bookServiceSpy.getBookTypes.and.returnValue(of(mockTypesResponse));

      store.loadTypes();
      expect(store.typesLoading()).toBe(true);

      tick();
      expect(store.typesLoading()).toBe(false);
    }));

    it('should update types with response data', fakeAsync(() => {
      bookServiceSpy.getBookTypes.and.returnValue(of(mockTypesResponse));

      store.loadTypes();
      tick();

      expect(store.types()).toEqual([
        { id: '1', name: 'technical' },
        { id: '2', name: 'fiction' },
      ]);
    }));
  });

  describe('loadCategories', () => {
    it('should set categoriesLoading to true while loading', fakeAsync(() => {
      bookServiceSpy.getCategories.and.returnValue(of(mockCategoriesResponse));

      store.loadCategories('technical');
      expect(store.categoriesLoading()).toBe(true);

      tick();
      expect(store.categoriesLoading()).toBe(false);
    }));

    it('should call BookService.getCategories with type', fakeAsync(() => {
      bookServiceSpy.getCategories.and.returnValue(of(mockCategoriesResponse));

      store.loadCategories('technical');
      tick();

      expect(bookServiceSpy.getCategories).toHaveBeenCalledWith('technical');
    }));

    it('should update categories with response data', fakeAsync(() => {
      bookServiceSpy.getCategories.and.returnValue(of(mockCategoriesResponse));

      store.loadCategories('technical');
      tick();

      expect(store.categories().length).toBe(2);
      expect(store.categories()[0].name).toBe('programming');
    }));

    it('should clear categories when called without type', fakeAsync(() => {
      bookServiceSpy.getCategories.and.returnValue(of(mockCategoriesResponse));

      // First load some categories
      store.loadCategories('technical');
      tick();
      expect(store.categories().length).toBe(2);

      // Clear categories
      store.loadCategories('');
      tick();

      expect(store.categories()).toEqual([]);
    }));
  });

  describe('loadLevels', () => {
    it('should set levelsLoading to true while loading', fakeAsync(() => {
      bookServiceSpy.getLevels.and.returnValue(of(mockLevelsResponse));

      store.loadLevels('technical');
      expect(store.levelsLoading()).toBe(true);

      tick();
      expect(store.levelsLoading()).toBe(false);
    }));

    it('should call BookService.getLevels with type', fakeAsync(() => {
      bookServiceSpy.getLevels.and.returnValue(of(mockLevelsResponse));

      store.loadLevels('technical');
      tick();

      expect(bookServiceSpy.getLevels).toHaveBeenCalledWith('technical');
    }));

    it('should update levels with response data', fakeAsync(() => {
      bookServiceSpy.getLevels.and.returnValue(of(mockLevelsResponse));

      store.loadLevels('technical');
      tick();

      expect(store.levels().length).toBe(2);
      expect(store.levels()[0].name).toBe('Beginner');
    }));

    it('should clear levels when called without type', fakeAsync(() => {
      bookServiceSpy.getLevels.and.returnValue(of(mockLevelsResponse));

      // First load some levels
      store.loadLevels('technical');
      tick();
      expect(store.levels().length).toBe(2);

      // Clear levels
      store.loadLevels('');
      tick();

      expect(store.levels()).toEqual([]);
    }));
  });

  describe('reset', () => {
    it('should reset all state to initial values', fakeAsync(() => {
      // First, populate some state
      bookServiceSpy.searchBooks.and.returnValue(of(mockSearchResponse));
      bookServiceSpy.getBookTypes.and.returnValue(of(mockTypesResponse));

      store.setFilters({ title: 'Clean' });
      store.searchBooks();
      store.loadTypes();
      tick();

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
    }));
  });

  describe('computed properties', () => {
    it('isEmpty should return true when no books', () => {
      expect(store.isEmpty()).toBe(true);
    });

    it('isEmpty should return false when there are books', fakeAsync(() => {
      bookServiceSpy.searchBooks.and.returnValue(of(mockSearchResponse));

      store.searchBooks();
      tick();

      expect(store.isEmpty()).toBe(false);
    }));

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
