import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpParams } from '@angular/common/http';
import { of } from 'rxjs';
import { firstValueFrom } from 'rxjs';

import { ApiService } from './api.service.js';

describe('ApiService', () => {
  let service: ApiService;
  let httpClientMock: {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    httpClientMock = {
      get: vi.fn().mockReturnValue(of({})),
      post: vi.fn().mockReturnValue(of({})),
      put: vi.fn().mockReturnValue(of({})),
      delete: vi.fn().mockReturnValue(of({})),
    };

    TestBed.configureTestingModule({
      providers: [ApiService, { provide: HttpClient, useValue: httpClientMock }],
    });

    service = TestBed.inject(ApiService);
  });

  describe('Service Creation', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });
  });

  describe('get()', () => {
    it('should call HttpClient.get with base URL and endpoint', async () => {
      httpClientMock.get.mockReturnValue(of({ data: 'result' }));

      await firstValueFrom(service.get('/books'));

      expect(httpClientMock.get).toHaveBeenCalledWith(
        '/api/books',
        expect.objectContaining({ params: expect.any(HttpParams) })
      );
    });

    it('should call HttpClient.get with empty HttpParams when no params provided', async () => {
      await firstValueFrom(service.get('/books'));

      const callArgs = httpClientMock.get.mock.calls[0][1];
      expect(callArgs.params.keys()).toHaveLength(0);
    });

    it('should call HttpClient.get with empty HttpParams when params is undefined', async () => {
      await firstValueFrom(service.get('/books', undefined));

      const callArgs = httpClientMock.get.mock.calls[0][1];
      expect(callArgs.params.keys()).toHaveLength(0);
    });

    it('should build HttpParams for scalar string param', async () => {
      await firstValueFrom(service.get('/books', { title: 'Clean Code' }));

      const callArgs = httpClientMock.get.mock.calls[0][1];
      expect(callArgs.params.get('title')).toBe('Clean Code');
    });

    it('should build HttpParams for scalar number param', async () => {
      await firstValueFrom(service.get('/books', { limit: 50 }));

      const callArgs = httpClientMock.get.mock.calls[0][1];
      expect(callArgs.params.get('limit')).toBe('50');
    });

    it('should build HttpParams for scalar boolean param', async () => {
      await firstValueFrom(service.get('/books', { available: true }));

      const callArgs = httpClientMock.get.mock.calls[0][1];
      expect(callArgs.params.get('available')).toBe('true');
    });

    it('should build HttpParams for array param by repeating the key', async () => {
      await firstValueFrom(service.get('/books', { categories: ['fiction', 'technical'] }));

      const callArgs = httpClientMock.get.mock.calls[0][1];
      expect(callArgs.params.getAll('categories')).toEqual(['fiction', 'technical']);
    });

    it('should skip array params with empty string items', async () => {
      await firstValueFrom(service.get('/books', { categories: ['fiction', '', 'technical'] }));

      const callArgs = httpClientMock.get.mock.calls[0][1];
      expect(callArgs.params.getAll('categories')).toEqual(['fiction', 'technical']);
    });

    it('should skip undefined params', async () => {
      await firstValueFrom(service.get('/books', { title: undefined, limit: 10 }));

      const callArgs = httpClientMock.get.mock.calls[0][1];
      expect(callArgs.params.has('title')).toBe(false);
      expect(callArgs.params.get('limit')).toBe('10');
    });

    it('should skip null params', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await firstValueFrom(service.get('/books', { title: null as any, limit: 5 }));

      const callArgs = httpClientMock.get.mock.calls[0][1];
      expect(callArgs.params.has('title')).toBe(false);
      expect(callArgs.params.get('limit')).toBe('5');
    });

    it('should skip empty string params', async () => {
      await firstValueFrom(service.get('/books', { title: '', limit: 5 }));

      const callArgs = httpClientMock.get.mock.calls[0][1];
      expect(callArgs.params.has('title')).toBe(false);
      expect(callArgs.params.get('limit')).toBe('5');
    });

    it('should build HttpParams combining scalars and arrays', async () => {
      await firstValueFrom(
        service.get('/books', { title: 'Clean', categories: ['fiction', 'technical'], limit: 10 })
      );

      const callArgs = httpClientMock.get.mock.calls[0][1];
      expect(callArgs.params.get('title')).toBe('Clean');
      expect(callArgs.params.getAll('categories')).toEqual(['fiction', 'technical']);
      expect(callArgs.params.get('limit')).toBe('10');
    });

    it('should return the observable from HttpClient', async () => {
      httpClientMock.get.mockReturnValue(of({ items: [{ id: '1' }] }));

      const result = await firstValueFrom(service.get<{ items: { id: string }[] }>('/books'));

      expect(result).toEqual({ items: [{ id: '1' }] });
    });
  });

  describe('post()', () => {
    it('should call HttpClient.post with base URL, endpoint and body', async () => {
      const body = { title: 'New Book', isbn: '978-0-13-468599-1' };
      httpClientMock.post.mockReturnValue(of({ id: 'new-id' }));

      await firstValueFrom(service.post('/books', body));

      expect(httpClientMock.post).toHaveBeenCalledWith('/api/books', body);
    });

    it('should return the observable from HttpClient', async () => {
      httpClientMock.post.mockReturnValue(of({ id: 'created-id' }));

      const result = await firstValueFrom(service.post<{ id: string }>('/books', {}));

      expect(result).toEqual({ id: 'created-id' });
    });
  });

  describe('put()', () => {
    it('should call HttpClient.put with base URL, endpoint and body', async () => {
      const body = { title: 'Updated Book' };
      httpClientMock.put.mockReturnValue(of({ id: 'existing-id' }));

      await firstValueFrom(service.put('/books/existing-id', body));

      expect(httpClientMock.put).toHaveBeenCalledWith('/api/books/existing-id', body);
    });

    it('should return the observable from HttpClient', async () => {
      httpClientMock.put.mockReturnValue(of({ updated: true }));

      const result = await firstValueFrom(service.put<{ updated: boolean }>('/books/1', {}));

      expect(result).toEqual({ updated: true });
    });
  });

  describe('delete()', () => {
    it('should call HttpClient.delete with base URL and endpoint', async () => {
      httpClientMock.delete.mockReturnValue(of(null));

      await firstValueFrom(service.delete('/books/some-id'));

      expect(httpClientMock.delete).toHaveBeenCalledWith('/api/books/some-id');
    });

    it('should return the observable from HttpClient', async () => {
      httpClientMock.delete.mockReturnValue(of({ deleted: true }));

      const result = await firstValueFrom(service.delete<{ deleted: boolean }>('/books/1'));

      expect(result).toEqual({ deleted: true });
    });
  });
});
