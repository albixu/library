import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { firstValueFrom } from 'rxjs';

import { RecommendationsService, RecommendationsResponse } from './recommendations.service.js';
import { ApiService } from '../../core/services/api.service.js';

describe('RecommendationsService', () => {
  let service: RecommendationsService;
  let apiServiceMock: { get: ReturnType<typeof vi.fn> };

  const mockResponse: RecommendationsResponse = {
    label: 'Programación',
    items: [
      {
        bookId: 'book-1',
        title: 'Clean Code',
        author: 'Robert C. Martin',
        coverUrl: 'https://example.com/cover.jpg',
        similarity: 0.95,
        dominantCategory: 'Programación',
      },
      {
        bookId: 'book-2',
        title: 'The Pragmatic Programmer',
        author: 'David Thomas',
        coverUrl: null,
        similarity: 0.88,
        dominantCategory: 'Programación',
      },
    ],
  };

  beforeEach(() => {
    apiServiceMock = {
      get: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [RecommendationsService, { provide: ApiService, useValue: apiServiceMock }],
    });

    service = TestBed.inject(RecommendationsService);
  });

  describe('Creation', () => {
    it('should create', () => {
      expect(service).toBeTruthy();
    });
  });

  describe('getRecommendations', () => {
    it('should call GET /books/recommendations', async () => {
      apiServiceMock.get.mockReturnValue(of(mockResponse));

      await firstValueFrom(service.getRecommendations());

      expect(apiServiceMock.get).toHaveBeenCalledWith('/books/recommendations');
    });

    it('should return the recommendations response', async () => {
      apiServiceMock.get.mockReturnValue(of(mockResponse));

      const result = await firstValueFrom(service.getRecommendations());

      expect(result).toEqual(mockResponse);
    });

    it('should return items array from response', async () => {
      apiServiceMock.get.mockReturnValue(of(mockResponse));

      const result = await firstValueFrom(service.getRecommendations());

      expect(result.items).toHaveLength(2);
      expect(result.items[0].bookId).toBe('book-1');
    });

    it('should handle items with null coverUrl', async () => {
      apiServiceMock.get.mockReturnValue(of(mockResponse));

      const result = await firstValueFrom(service.getRecommendations());

      expect(result.items[1].coverUrl).toBeNull();
    });

    it('should return the category label', async () => {
      apiServiceMock.get.mockReturnValue(of(mockResponse));

      const result = await firstValueFrom(service.getRecommendations());

      expect(result.label).toBe('Programación');
    });

    it('should handle empty items array', async () => {
      const emptyResponse: RecommendationsResponse = { label: '', items: [] };
      apiServiceMock.get.mockReturnValue(of(emptyResponse));

      const result = await firstValueFrom(service.getRecommendations());

      expect(result.items).toHaveLength(0);
    });
  });
});
