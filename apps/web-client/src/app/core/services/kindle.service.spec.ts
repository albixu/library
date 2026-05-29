import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';

import { KindleService } from './kindle.service.js';
import { BookService } from './book.service.js';
import { Book } from '../models/index.js';
import { provideZonelessChangeDetection } from '@angular/core';

describe('KindleService', () => {
  let service: KindleService;
  let mockBookService: { sendBookByEmail: ReturnType<typeof vi.fn> };

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

  beforeEach(() => {
    mockBookService = {
      sendBookByEmail: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        KindleService,
        { provide: BookService, useValue: mockBookService },
      ],
    });

    service = TestBed.inject(KindleService);
  });

  describe('Service Creation', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });
  });

  describe('sendToKindle', () => {
    it('should return success result when API call succeeds', async () => {
      mockBookService.sendBookByEmail.mockReturnValue(of(undefined));

      const result = await firstValueFrom(service.sendToKindle(mockBook, 'test@kindle.com'));
      expect(result.success).toBe(true);
      expect(result.message).toContain('Clean Code');
      expect(result.message).toContain('test@kindle.com');
    });

    it('should call BookService.sendBookByEmail with correct arguments', () => {
      mockBookService.sendBookByEmail.mockReturnValue(of(undefined));

      service.sendToKindle(mockBook, 'test@kindle.com').subscribe();

      expect(mockBookService.sendBookByEmail).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440000',
        'test@kindle.com'
      );
    });

    it('should return error result when API call fails', async () => {
      mockBookService.sendBookByEmail.mockReturnValue(throwError(() => new Error('Network error')));

      const result = await firstValueFrom(service.sendToKindle(mockBook, 'test@kindle.com'));
      expect(result.success).toBe(false);
      expect(result.message).toContain('Error al enviar');
    });

    it('should return error result when API returns HTTP error', async () => {
      mockBookService.sendBookByEmail.mockReturnValue(
        throwError(() => ({ status: 404, message: 'Book not found' }))
      );

      const result = await firstValueFrom(service.sendToKindle(mockBook, 'test@gmail.com'));
      expect(result.success).toBe(false);
      expect(result.message).toBeTruthy();
    });
  });

  describe('isKindleEmail', () => {
    it('should return true for kindle.com emails', () => {
      expect(service.isKindleEmail('user@kindle.com')).toBe(true);
    });

    it('should return true for kindle.cn emails', () => {
      expect(service.isKindleEmail('user@kindle.cn')).toBe(true);
    });

    it('should return false for non-kindle emails', () => {
      expect(service.isKindleEmail('user@gmail.com')).toBe(false);
      expect(service.isKindleEmail('user@example.com')).toBe(false);
    });

    it('should return false for empty or invalid input', () => {
      expect(service.isKindleEmail('')).toBe(false);
      expect(service.isKindleEmail(null as unknown as string)).toBe(false);
    });
  });
});
