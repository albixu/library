import { TestBed, fakeAsync, tick } from '@angular/core/testing';

import { KindleService, SendToKindleResult } from './kindle.service.js';
import { Book } from '../models/index.js';

describe('KindleService', () => {
  let service: KindleService;

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
    TestBed.configureTestingModule({
      providers: [KindleService],
    });

    service = TestBed.inject(KindleService);
  });

  describe('Service Creation', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });
  });

  describe('sendToKindle', () => {
    it('should return success result with valid email', fakeAsync(() => {
      let result: SendToKindleResult | undefined;

      service.sendToKindle(mockBook, 'test@kindle.com').subscribe((r) => {
        result = r;
      });

      tick(1000); // Mock delay

      expect(result).toBeDefined();
      expect(result?.success).toBe(true);
      expect(result?.message).toContain('Clean Code');
      expect(result?.message).toContain('test@kindle.com');
    }));

    it('should return error result with invalid email', fakeAsync(() => {
      let result: SendToKindleResult | undefined;

      service.sendToKindle(mockBook, 'invalid-email').subscribe((r) => {
        result = r;
      });

      tick(1000);

      expect(result).toBeDefined();
      expect(result?.success).toBe(false);
      expect(result?.message).toContain('Invalid email');
    }));

    it('should return error result with empty email', fakeAsync(() => {
      let result: SendToKindleResult | undefined;

      service.sendToKindle(mockBook, '').subscribe((r) => {
        result = r;
      });

      tick(1000);

      expect(result).toBeDefined();
      expect(result?.success).toBe(false);
      expect(result?.message).toContain('Invalid email');
    }));

    it('should return error result for unavailable book', fakeAsync(() => {
      const unavailableBook = { ...mockBook, available: false };
      let result: SendToKindleResult | undefined;

      service.sendToKindle(unavailableBook, 'test@kindle.com').subscribe((r) => {
        result = r;
      });

      tick(1000);

      expect(result).toBeDefined();
      expect(result?.success).toBe(false);
      expect(result?.message).toContain('not available');
    }));
  });

  describe('validateKindleEmail', () => {
    it('should return true for valid kindle email', () => {
      expect(service.validateKindleEmail('user@kindle.com')).toBe(true);
    });

    it('should return true for valid kindle.cn email', () => {
      expect(service.validateKindleEmail('user@kindle.cn')).toBe(true);
    });

    it('should return true for standard email format', () => {
      expect(service.validateKindleEmail('user@example.com')).toBe(true);
    });

    it('should return false for invalid email', () => {
      expect(service.validateKindleEmail('invalid')).toBe(false);
      expect(service.validateKindleEmail('invalid@')).toBe(false);
      expect(service.validateKindleEmail('@invalid.com')).toBe(false);
      expect(service.validateKindleEmail('')).toBe(false);
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
  });
});
