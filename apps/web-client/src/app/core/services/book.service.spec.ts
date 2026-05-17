import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { firstValueFrom } from 'rxjs';

import { BookService } from './book.service.js';
import { ApiService } from './api.service.js';
import {
  BookSearchResponse,
  BookTypeListResponse,
  CategoryListResponse,
  BookLevelListResponse,
  SearchFilters,
  PaginationParams,
} from '../models/index.js';

describe('BookService', () => {
  let service: BookService;
  let apiServiceMock: { get: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn> };

  const mockBookSearchResponse: BookSearchResponse = {
    success: true,
    data: {
      items: [
        {
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
        },
      ],
      pagination: {
        limit: 50,
        hasNextPage: false,
        nextCursor: null,
        totalCount: 1,
      },
    },
    error: null,
  };

  const mockBookTypesResponse: BookTypeListResponse = {
    success: true,
    data: [
      { id: '1', name: 'biography' },
      { id: '2', name: 'technical' },
    ],
    error: null,
  };

  const mockCategoriesResponse: CategoryListResponse = {
    success: true,
    data: [
      { id: '1', name: 'programming', typeId: '2', description: 'Programming books' },
      { id: '2', name: 'databases', typeId: '2', description: 'Database books' },
    ],
    error: null,
  };

  const mockLevelsResponse: BookLevelListResponse = {
    success: true,
    data: [
      { id: '1', name: 'Beginner' },
      { id: '2', name: 'Intermediate' },
      { id: '3', name: 'Advanced' },
    ],
    error: null,
  };

  let apiServicePostMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    apiServicePostMock = vi.fn();
    apiServiceMock = {
      get: vi.fn(),
      post: apiServicePostMock,
    };

    TestBed.configureTestingModule({
      providers: [BookService, { provide: ApiService, useValue: apiServiceMock }],
    });

    service = TestBed.inject(BookService);
  });

  describe('Service Creation', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });
  });

  describe('searchBooks', () => {
    it('should call ApiService.get with /books endpoint', async () => {
      apiServiceMock.get.mockReturnValue(of(mockBookSearchResponse));

      await firstValueFrom(service.searchBooks());

      expect(apiServiceMock.get).toHaveBeenCalledWith('/books', expect.any(Object));
    });

    it('should pass filters as query params', async () => {
      apiServiceMock.get.mockReturnValue(of(mockBookSearchResponse));

      const filters: SearchFilters = {
        isbn: '9780132350884',
        title: 'Clean',
        author: 'Martin',
        type: 'technical',
        categories: ['programming'],
        levels: ['Intermediate'],
        text: 'design patterns',
      };

      await firstValueFrom(service.searchBooks(filters));

      expect(apiServiceMock.get).toHaveBeenCalledWith('/books', {
        isbn: '9780132350884',
        title: 'Clean',
        author: 'Martin',
        types: 'technical',
        categories: ['programming'],
        levels: ['Intermediate'],
        text: 'design patterns',
        limit: 50,
        cursor: undefined,
      });
    });

    it('should pass pagination params', async () => {
      apiServiceMock.get.mockReturnValue(of(mockBookSearchResponse));

      const pagination: PaginationParams = {
        limit: 25,
        cursor: 'abc123',
      };

      await firstValueFrom(service.searchBooks({}, pagination));

      expect(apiServiceMock.get).toHaveBeenCalledWith(
        '/books',
        expect.objectContaining({
          limit: 25,
          cursor: 'abc123',
        })
      );
    });

    it('should use default limit of 50 when not specified', async () => {
      apiServiceMock.get.mockReturnValue(of(mockBookSearchResponse));

      await firstValueFrom(service.searchBooks({}));

      expect(apiServiceMock.get).toHaveBeenCalledWith(
        '/books',
        expect.objectContaining({ limit: 50 })
      );
    });

    it('should return BookSearchResponse', async () => {
      apiServiceMock.get.mockReturnValue(of(mockBookSearchResponse));

      const response = await firstValueFrom(service.searchBooks());

      expect(response).toEqual(mockBookSearchResponse);
      expect(response.data?.items.length).toBe(1);
      expect(response.data?.items[0].title).toBe('Clean Code');
    });

    it('should not include empty filter values in params', async () => {
      apiServiceMock.get.mockReturnValue(of(mockBookSearchResponse));

      const filters: SearchFilters = {
        title: 'Clean',
        author: '', // empty
        categories: [], // empty array
      };

      await firstValueFrom(service.searchBooks(filters));

      const calledParams =
        apiServiceMock.get.mock.calls[apiServiceMock.get.mock.calls.length - 1][1];
      expect(calledParams.author).toBeUndefined();
      expect(calledParams.categories).toBeUndefined();
    });
  });

  describe('getBookTypes', () => {
    it('should call ApiService.get with /book-types endpoint', async () => {
      apiServiceMock.get.mockReturnValue(of(mockBookTypesResponse));

      await firstValueFrom(service.getBookTypes());

      expect(apiServiceMock.get).toHaveBeenCalledWith('/book-types');
    });

    it('should return BookTypeListResponse', async () => {
      apiServiceMock.get.mockReturnValue(of(mockBookTypesResponse));

      const response = await firstValueFrom(service.getBookTypes());

      expect(response).toEqual(mockBookTypesResponse);
      expect(response.data?.length).toBe(2);
    });
  });

  describe('getCategories', () => {
    it('should call ApiService.get with /book-categories endpoint', async () => {
      apiServiceMock.get.mockReturnValue(of(mockCategoriesResponse));

      await firstValueFrom(service.getCategories());

      expect(apiServiceMock.get).toHaveBeenCalledWith('/book-categories', undefined);
    });

    it('should pass type filter when provided', async () => {
      apiServiceMock.get.mockReturnValue(of(mockCategoriesResponse));

      await firstValueFrom(service.getCategories('technical'));

      expect(apiServiceMock.get).toHaveBeenCalledWith('/book-categories', { type: 'technical' });
    });

    it('should return CategoryListResponse', async () => {
      apiServiceMock.get.mockReturnValue(of(mockCategoriesResponse));

      const response = await firstValueFrom(service.getCategories());

      expect(response).toEqual(mockCategoriesResponse);
      expect(response.data?.length).toBe(2);
      expect(response.data?.[0].typeId).toBe('2');
    });
  });

  describe('getLevels', () => {
    it('should call ApiService.get with /book-levels endpoint', async () => {
      apiServiceMock.get.mockReturnValue(of(mockLevelsResponse));

      await firstValueFrom(service.getLevels());

      expect(apiServiceMock.get).toHaveBeenCalledWith('/book-levels', undefined);
    });

    it('should pass type filter when provided', async () => {
      apiServiceMock.get.mockReturnValue(of(mockLevelsResponse));

      await firstValueFrom(service.getLevels('technical'));

      expect(apiServiceMock.get).toHaveBeenCalledWith('/book-levels', { type: 'technical' });
    });

    it('should return BookLevelListResponse', async () => {
      apiServiceMock.get.mockReturnValue(of(mockLevelsResponse));

      const response = await firstValueFrom(service.getLevels());

      expect(response).toEqual(mockLevelsResponse);
      expect(response.data?.length).toBe(3);
    });
  });

  describe('sendBookByEmail', () => {
    it('should call ApiService.post with correct endpoint and body', async () => {
      apiServiceMock.post.mockReturnValue(of(undefined));

      await firstValueFrom(service.sendBookByEmail('book-id-123', 'user@example.com'));

      expect(apiServiceMock.post).toHaveBeenCalledWith('/books/book-id-123/send', {
        email: 'user@example.com',
      });
    });

    it('should use the bookId in the URL path', async () => {
      apiServiceMock.post.mockReturnValue(of(undefined));

      await firstValueFrom(service.sendBookByEmail('abc-456', 'test@test.com'));

      expect(apiServiceMock.post).toHaveBeenCalledWith(
        '/books/abc-456/send',
        expect.objectContaining({ email: 'test@test.com' })
      );
    });

    it('should return Observable<void>', async () => {
      apiServiceMock.post.mockReturnValue(of(undefined));

      const result = await firstValueFrom(
        service.sendBookByEmail('book-id-123', 'user@example.com')
      );

      expect(result).toBeUndefined();
    });

    it('should propagate HTTP errors', async () => {
      const { throwError } = await import('rxjs');
      const httpError = new Error('HTTP 500 Internal Server Error');
      apiServiceMock.post.mockReturnValue(throwError(() => httpError));

      await expect(
        firstValueFrom(service.sendBookByEmail('book-id-123', 'user@example.com'))
      ).rejects.toThrow('HTTP 500 Internal Server Error');
    });
  });
});
