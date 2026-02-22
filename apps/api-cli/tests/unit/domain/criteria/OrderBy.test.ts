import { describe, it, expect } from 'vitest';
import {
  OrderBy,
  InvalidOrderByError,
} from '../../../../src/domain/criteria/OrderBy.js';

describe('OrderBy', () => {
  describe('create', () => {
    it('should create OrderBy with valid field name', () => {
      const orderBy = OrderBy.create('title');
      expect(orderBy.value).toBe('title');
    });

    it('should trim whitespace from field name', () => {
      const orderBy = OrderBy.create('  title  ');
      expect(orderBy.value).toBe('title');
    });

    it('should throw InvalidOrderByError for empty string', () => {
      expect(() => OrderBy.create('')).toThrow(InvalidOrderByError);
    });

    it('should throw InvalidOrderByError for whitespace-only string', () => {
      expect(() => OrderBy.create('   ')).toThrow(InvalidOrderByError);
    });

    it('should throw with descriptive message', () => {
      try {
        OrderBy.create('');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidOrderByError);
        expect((error as Error).message).toContain('cannot be empty');
      }
    });
  });

  describe('fromPersistence', () => {
    it('should create OrderBy without validation', () => {
      const orderBy = OrderBy.fromPersistence('created_at');
      expect(orderBy.value).toBe('created_at');
    });

    it('should not trim whitespace', () => {
      const orderBy = OrderBy.fromPersistence('  title  ');
      expect(orderBy.value).toBe('  title  ');
    });
  });

  describe('none', () => {
    it('should create OrderBy with empty value', () => {
      const orderBy = OrderBy.none();
      expect(orderBy.value).toBe('');
    });

    it('should return true for isNone', () => {
      expect(OrderBy.none().isNone()).toBe(true);
    });
  });

  describe('isNone', () => {
    it('should return true for empty OrderBy', () => {
      const orderBy = OrderBy.none();
      expect(orderBy.isNone()).toBe(true);
    });

    it('should return false for non-empty OrderBy', () => {
      const orderBy = OrderBy.create('title');
      expect(orderBy.isNone()).toBe(false);
    });
  });

  describe('equals', () => {
    it('should return true for OrderBys with same value', () => {
      const orderBy1 = OrderBy.create('title');
      const orderBy2 = OrderBy.create('title');
      expect(orderBy1.equals(orderBy2)).toBe(true);
    });

    it('should return false for OrderBys with different values', () => {
      const orderBy1 = OrderBy.create('title');
      const orderBy2 = OrderBy.create('author');
      expect(orderBy1.equals(orderBy2)).toBe(false);
    });

    it('should compare none OrderBys as equal', () => {
      expect(OrderBy.none().equals(OrderBy.none())).toBe(true);
    });
  });

  describe('toString', () => {
    it('should return the field name', () => {
      const orderBy = OrderBy.create('title');
      expect(orderBy.toString()).toBe('title');
    });

    it('should return empty string for none', () => {
      expect(OrderBy.none().toString()).toBe('');
    });
  });

  describe('immutability', () => {
    it('should be frozen', () => {
      const orderBy = OrderBy.create('title');
      expect(Object.isFrozen(orderBy)).toBe(true);
    });

    it('should not allow property modification', () => {
      const orderBy = OrderBy.create('title');
      expect(() => {
        // @ts-expect-error - Testing runtime immutability
        orderBy.value = 'modified';
      }).toThrow();
    });
  });
});
