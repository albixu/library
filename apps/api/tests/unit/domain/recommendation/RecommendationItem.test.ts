import { describe, it, expect } from 'vitest';
import { RecommendationItem } from '../../../../src/domain/recommendation/RecommendationItem.js';

describe('RecommendationItem', () => {
  const validProps = {
    bookId: 'book-uuid-123',
    title: 'Clean Code',
    author: 'Robert C. Martin',
    similarity: 0.85,
    dominantCategory: 'Programming',
  };

  describe('create()', () => {
    it('should create a valid RecommendationItem', () => {
      const item = RecommendationItem.create(validProps);
      expect(item.bookId).toBe('book-uuid-123');
      expect(item.title).toBe('Clean Code');
      expect(item.author).toBe('Robert C. Martin');
      expect(item.similarity).toBe(0.85);
      expect(item.dominantCategory).toBe('Programming');
    });

    it('should accept similarity = 0 (boundary)', () => {
      const item = RecommendationItem.create({ ...validProps, similarity: 0 });
      expect(item.similarity).toBe(0);
    });

    it('should accept similarity = 1 (boundary)', () => {
      const item = RecommendationItem.create({ ...validProps, similarity: 1 });
      expect(item.similarity).toBe(1);
    });

    it('should throw when similarity < 0', () => {
      expect(() =>
        RecommendationItem.create({ ...validProps, similarity: -0.1 }),
      ).toThrow('similarity must be between 0 and 1');
    });

    it('should throw when similarity > 1', () => {
      expect(() =>
        RecommendationItem.create({ ...validProps, similarity: 1.1 }),
      ).toThrow('similarity must be between 0 and 1');
    });
  });

  describe('immutability', () => {
    it('should be frozen (immutable)', () => {
      const item = RecommendationItem.create(validProps);
      expect(Object.isFrozen(item)).toBe(true);
    });
  });
});
