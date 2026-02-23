import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

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
  let apiServiceSpy: jasmine.SpyObj<ApiService>;

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

  beforeEach(() => {
    const spy = jasmine.createSpyObj('ApiService', ['get']);

    TestBed.configureTestingModule({
      providers: [BookService, { provide: ApiService, useValue: spy }],
    });

    service = TestBed.inject(BookService);
    apiServiceSpy = TestBed.inject(ApiService) as jasmine.SpyObj<ApiService>;
  });

  describe('Service Creation', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });
  });

  describe('searchBooks', () => {
    it('should call ApiService.get with /books endpoint', (done) => {
      apiServiceSpy.get.and.returnValue(of(mockBookSearchResponse));

      service.searchBooks().subscribe(() => {
        expect(apiServiceSpy.get).toHaveBeenCalledWith('/books', jasmine.any(Object));
        done();
      });
    });

    it('should pass filters as query params', (done) => {
      apiServiceSpy.get.and.returnValue(of(mockBookSearchResponse));

      const filters: SearchFilters = {
        isbn: '9780132350884',
        title: 'Clean',
        author: 'Martin',
        type: 'technical',
        categories: ['programming'],
        levels: ['Intermediate'],
        text: 'design patterns',
      };

      service.searchBooks(filters).subscribe(() => {
        expect(apiServiceSpy.get).toHaveBeenCalledWith('/books', {
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
        done();
      });
    });

    it('should pass pagination params', (done) => {
      apiServiceSpy.get.and.returnValue(of(mockBookSearchResponse));

      const pagination: PaginationParams = {
        limit: 25,
        cursor: 'abc123',
      };

      service.searchBooks({}, pagination).subscribe(() => {
        expect(apiServiceSpy.get).toHaveBeenCalledWith(
          '/books',
          jasmine.objectContaining({
            limit: 25,
            cursor: 'abc123',
          })
        );
        done();
      });
    });

    it('should use default limit of 50 when not specified', (done) => {
      apiServiceSpy.get.and.returnValue(of(mockBookSearchResponse));

      service.searchBooks({}).subscribe(() => {
        expect(apiServiceSpy.get).toHaveBeenCalledWith(
          '/books',
          jasmine.objectContaining({ limit: 50 })
        );
        done();
      });
    });

    it('should return BookSearchResponse', (done) => {
      apiServiceSpy.get.and.returnValue(of(mockBookSearchResponse));

      service.searchBooks().subscribe((response) => {
        expect(response).toEqual(mockBookSearchResponse);
        expect(response.data?.items.length).toBe(1);
        expect(response.data?.items[0].title).toBe('Clean Code');
        done();
      });
    });

    it('should not include empty filter values in params', (done) => {
      apiServiceSpy.get.and.returnValue(of(mockBookSearchResponse));

      const filters: SearchFilters = {
        title: 'Clean',
        author: '', // empty
        categories: [], // empty array
      };

      service.searchBooks(filters).subscribe(() => {
        const calledParams = apiServiceSpy.get.calls.mostRecent().args[1];
        expect(calledParams.author).toBeUndefined();
        expect(calledParams.categories).toBeUndefined();
        done();
      });
    });
  });

  describe('getBookTypes', () => {
    it('should call ApiService.get with /book-types endpoint', (done) => {
      apiServiceSpy.get.and.returnValue(of(mockBookTypesResponse));

      service.getBookTypes().subscribe(() => {
        expect(apiServiceSpy.get).toHaveBeenCalledWith('/book-types', undefined);
        done();
      });
    });

    it('should return BookTypeListResponse', (done) => {
      apiServiceSpy.get.and.returnValue(of(mockBookTypesResponse));

      service.getBookTypes().subscribe((response) => {
        expect(response).toEqual(mockBookTypesResponse);
        expect(response.data?.length).toBe(2);
        done();
      });
    });
  });

  describe('getCategories', () => {
    it('should call ApiService.get with /book-categories endpoint', (done) => {
      apiServiceSpy.get.and.returnValue(of(mockCategoriesResponse));

      service.getCategories().subscribe(() => {
        expect(apiServiceSpy.get).toHaveBeenCalledWith('/book-categories', undefined);
        done();
      });
    });

    it('should pass type filter when provided', (done) => {
      apiServiceSpy.get.and.returnValue(of(mockCategoriesResponse));

      service.getCategories('technical').subscribe(() => {
        expect(apiServiceSpy.get).toHaveBeenCalledWith('/book-categories', { type: 'technical' });
        done();
      });
    });

    it('should return CategoryListResponse', (done) => {
      apiServiceSpy.get.and.returnValue(of(mockCategoriesResponse));

      service.getCategories().subscribe((response) => {
        expect(response).toEqual(mockCategoriesResponse);
        expect(response.data?.length).toBe(2);
        expect(response.data?.[0].typeId).toBe('2');
        done();
      });
    });
  });

  describe('getLevels', () => {
    it('should call ApiService.get with /book-levels endpoint', (done) => {
      apiServiceSpy.get.and.returnValue(of(mockLevelsResponse));

      service.getLevels().subscribe(() => {
        expect(apiServiceSpy.get).toHaveBeenCalledWith('/book-levels', undefined);
        done();
      });
    });

    it('should pass type filter when provided', (done) => {
      apiServiceSpy.get.and.returnValue(of(mockLevelsResponse));

      service.getLevels('technical').subscribe(() => {
        expect(apiServiceSpy.get).toHaveBeenCalledWith('/book-levels', { type: 'technical' });
        done();
      });
    });

    it('should return BookLevelListResponse', (done) => {
      apiServiceSpy.get.and.returnValue(of(mockLevelsResponse));

      service.getLevels().subscribe((response) => {
        expect(response).toEqual(mockLevelsResponse);
        expect(response.data?.length).toBe(3);
        done();
      });
    });
  });
});
