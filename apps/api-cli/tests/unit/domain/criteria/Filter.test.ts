import { describe, it, expect } from 'vitest';
import { Filter } from '../../../../src/domain/criteria/Filter.js';
import { FilterOperator } from '../../../../src/domain/criteria/FilterOperator.js';

describe('Filter', () => {
  describe('create', () => {
    it('should create a filter with field, operator, and value', () => {
      const filter = Filter.create('title', 'EQUALS', 'Clean Code');

      expect(filter.field.value).toBe('title');
      expect(filter.operator.value).toBe('EQUALS');
      expect(filter.value.value).toBe('Clean Code');
    });

    it('should create a filter with array value', () => {
      const filter = Filter.create('categories', 'IN', ['programming', 'tech']);

      expect(filter.field.value).toBe('categories');
      expect(filter.operator.value).toBe('IN');
      expect(filter.value.value).toEqual(['programming', 'tech']);
    });
  });

  describe('factory methods', () => {
    describe('equals', () => {
      it('should create an EQUALS filter', () => {
        const filter = Filter.equals('isbn', '9780132350884');

        expect(filter.field.value).toBe('isbn');
        expect(filter.operator.equals(FilterOperator.EQUALS)).toBe(true);
        expect(filter.value.value).toBe('9780132350884');
      });
    });

    describe('notEquals', () => {
      it('should create a NOT_EQUALS filter', () => {
        const filter = Filter.notEquals('type', 'novel');

        expect(filter.field.value).toBe('type');
        expect(filter.operator.equals(FilterOperator.NOT_EQUALS)).toBe(true);
        expect(filter.value.value).toBe('novel');
      });
    });

    describe('contains', () => {
      it('should create a CONTAINS filter', () => {
        const filter = Filter.contains('title', 'Clean');

        expect(filter.field.value).toBe('title');
        expect(filter.operator.equals(FilterOperator.CONTAINS)).toBe(true);
        expect(filter.value.value).toBe('Clean');
      });
    });

    describe('in', () => {
      it('should create an IN filter', () => {
        const filter = Filter.in('types', ['technical', 'reference']);

        expect(filter.field.value).toBe('types');
        expect(filter.operator.equals(FilterOperator.IN)).toBe(true);
        expect(filter.value.value).toEqual(['technical', 'reference']);
      });
    });

    describe('similarTo', () => {
      it('should create a SIMILAR_TO filter', () => {
        const filter = Filter.similarTo('embedding', 'books about programming');

        expect(filter.field.value).toBe('embedding');
        expect(filter.operator.equals(FilterOperator.SIMILAR_TO)).toBe(true);
        expect(filter.value.value).toBe('books about programming');
      });
    });

    describe('greaterThan', () => {
      it('should create a GT filter', () => {
        const filter = Filter.greaterThan('year', 2020);

        expect(filter.field.value).toBe('year');
        expect(filter.operator.equals(FilterOperator.GT)).toBe(true);
        expect(filter.value.value).toBe(2020);
      });
    });

    describe('lessThan', () => {
      it('should create a LT filter', () => {
        const filter = Filter.lessThan('price', 50);

        expect(filter.field.value).toBe('price');
        expect(filter.operator.equals(FilterOperator.LT)).toBe(true);
        expect(filter.value.value).toBe(50);
      });
    });

    describe('greaterThanOrEqual', () => {
      it('should create a GTE filter', () => {
        const filter = Filter.greaterThanOrEqual('year', 2020);

        expect(filter.field.value).toBe('year');
        expect(filter.operator.equals(FilterOperator.GTE)).toBe(true);
        expect(filter.value.value).toBe(2020);
      });
    });

    describe('lessThanOrEqual', () => {
      it('should create a LTE filter', () => {
        const filter = Filter.lessThanOrEqual('price', 100);

        expect(filter.field.value).toBe('price');
        expect(filter.operator.equals(FilterOperator.LTE)).toBe(true);
        expect(filter.value.value).toBe(100);
      });
    });
  });

  describe('isSimilarityFilter', () => {
    it('should return true for SIMILAR_TO filter', () => {
      const filter = Filter.similarTo('embedding', 'search text');
      expect(filter.isSimilarityFilter()).toBe(true);
    });

    it('should return false for non-SIMILAR_TO filters', () => {
      expect(Filter.equals('title', 'test').isSimilarityFilter()).toBe(false);
      expect(Filter.contains('author', 'test').isSimilarityFilter()).toBe(false);
      expect(Filter.in('types', ['a']).isSimilarityFilter()).toBe(false);
    });
  });

  describe('equals', () => {
    it('should return true for identical filters', () => {
      const filter1 = Filter.equals('title', 'Clean Code');
      const filter2 = Filter.equals('title', 'Clean Code');
      expect(filter1.equals(filter2)).toBe(true);
    });

    it('should return false for different fields', () => {
      const filter1 = Filter.equals('title', 'Clean Code');
      const filter2 = Filter.equals('author', 'Clean Code');
      expect(filter1.equals(filter2)).toBe(false);
    });

    it('should return false for different operators', () => {
      const filter1 = Filter.equals('title', 'Clean Code');
      const filter2 = Filter.contains('title', 'Clean Code');
      expect(filter1.equals(filter2)).toBe(false);
    });

    it('should return false for different values', () => {
      const filter1 = Filter.equals('title', 'Clean Code');
      const filter2 = Filter.equals('title', 'Clean Architecture');
      expect(filter1.equals(filter2)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return string representation', () => {
      const filter = Filter.equals('title', 'Clean Code');
      expect(filter.toString()).toBe('title EQUALS Clean Code');
    });

    it('should handle array values', () => {
      const filter = Filter.in('types', ['a', 'b']);
      expect(filter.toString()).toBe('types IN [a, b]');
    });
  });

  describe('immutability', () => {
    it('should be frozen', () => {
      const filter = Filter.equals('title', 'test');
      expect(Object.isFrozen(filter)).toBe(true);
    });
  });
});
