import { describe, it, expect } from 'vitest';
import { Criteria } from '../../../../src/domain/criteria/Criteria.js';
import { Filters } from '../../../../src/domain/criteria/Filters.js';
import { Filter } from '../../../../src/domain/criteria/Filter.js';
import { Order } from '../../../../src/domain/criteria/Order.js';

describe('Criteria', () => {
  describe('create', () => {
    it('should create empty Criteria with defaults', () => {
      const criteria = Criteria.create();
      expect(criteria.filters.isEmpty()).toBe(true);
      expect(criteria.order.isNone()).toBe(true);
      expect(criteria.limit).toBe(50);
      expect(criteria.cursor).toBe(null);
    });

    it('should create Criteria with provided filters', () => {
      const filters = Filters.fromValues([Filter.equals('title', 'Test')]);
      const criteria = Criteria.create({ filters });
      expect(criteria.filters.count()).toBe(1);
    });

    it('should create Criteria with provided order', () => {
      const order = Order.asc('title');
      const criteria = Criteria.create({ order });
      expect(criteria.order.equals(order)).toBe(true);
    });

    it('should create Criteria with provided limit', () => {
      const criteria = Criteria.create({ limit: 25 });
      expect(criteria.limit).toBe(25);
    });

    it('should create Criteria with provided cursor', () => {
      const criteria = Criteria.create({ cursor: 'abc123' });
      expect(criteria.cursor).toBe('abc123');
    });
  });

  describe('empty', () => {
    it('should create empty Criteria', () => {
      const criteria = Criteria.empty();
      expect(criteria.hasFilters()).toBe(false);
      expect(criteria.hasOrder()).toBe(false);
      expect(criteria.hasCursor()).toBe(false);
    });
  });

  describe('withFilters', () => {
    it('should create Criteria with only filters', () => {
      const filters = Filters.fromValues([Filter.equals('author', 'John')]);
      const criteria = Criteria.withFilters(filters);
      expect(criteria.hasFilters()).toBe(true);
      expect(criteria.filters.count()).toBe(1);
    });
  });

  describe('limit validation', () => {
    it('should clamp limit to minimum of 1', () => {
      const criteria = Criteria.create({ limit: 0 });
      expect(criteria.limit).toBe(1);
    });

    it('should clamp limit to minimum for negative values', () => {
      const criteria = Criteria.create({ limit: -10 });
      expect(criteria.limit).toBe(1);
    });

    it('should clamp limit to maximum of 100', () => {
      const criteria = Criteria.create({ limit: 200 });
      expect(criteria.limit).toBe(100);
    });

    it('should floor decimal limits', () => {
      const criteria = Criteria.create({ limit: 25.9 });
      expect(criteria.limit).toBe(25);
    });
  });

  describe('builder methods', () => {
    describe('withEquals', () => {
      it('should add EQUALS filter', () => {
        const criteria = Criteria.empty().withEquals('title', 'Test Book');
        expect(criteria.hasFilters()).toBe(true);
        expect(criteria.filters.count()).toBe(1);
      });

      it('should not mutate original criteria', () => {
        const original = Criteria.empty();
        const modified = original.withEquals('title', 'Test');
        expect(original.hasFilters()).toBe(false);
        expect(modified.hasFilters()).toBe(true);
      });
    });

    describe('withContains', () => {
      it('should add CONTAINS filter', () => {
        const criteria = Criteria.empty().withContains('title', 'Book');
        expect(criteria.filters.count()).toBe(1);
      });
    });

    describe('withIn', () => {
      it('should add IN filter', () => {
        const criteria = Criteria.empty().withIn('type', ['fiction', 'drama']);
        expect(criteria.filters.count()).toBe(1);
      });
    });

    describe('withSimilarTo', () => {
      it('should add SIMILAR_TO filter', () => {
        const criteria = Criteria.empty().withSimilarTo(
          'embedding',
          'search text',
        );
        expect(criteria.filters.count()).toBe(1);
        expect(criteria.hasSimilarityFilter()).toBe(true);
      });
    });

    describe('withFilter', () => {
      it('should add custom filter', () => {
        const filter = Filter.greaterThan('pages', 100);
        const criteria = Criteria.empty().withFilter(filter);
        expect(criteria.filters.count()).toBe(1);
      });
    });

    describe('withFilters', () => {
      it('should add multiple filters', () => {
        const filters = [
          Filter.equals('author', 'John'),
          Filter.contains('title', 'Guide'),
        ];
        const criteria = Criteria.empty().withFilters(filters);
        expect(criteria.filters.count()).toBe(2);
      });
    });

    describe('withOrder', () => {
      it('should set order', () => {
        const order = Order.desc('created_at');
        const criteria = Criteria.empty().withOrder(order);
        expect(criteria.hasOrder()).toBe(true);
        expect(criteria.order.equals(order)).toBe(true);
      });

      it('should not mutate original criteria', () => {
        const original = Criteria.empty();
        const modified = original.withOrder(Order.asc('title'));
        expect(original.hasOrder()).toBe(false);
        expect(modified.hasOrder()).toBe(true);
      });
    });

    describe('orderByAsc', () => {
      it('should set ascending order', () => {
        const criteria = Criteria.empty().orderByAsc('title');
        expect(criteria.order.isAsc()).toBe(true);
        expect(criteria.order.orderBy.value).toBe('title');
      });
    });

    describe('orderByDesc', () => {
      it('should set descending order', () => {
        const criteria = Criteria.empty().orderByDesc('similarity');
        expect(criteria.order.isDesc()).toBe(true);
        expect(criteria.order.orderBy.value).toBe('similarity');
      });
    });

    describe('withLimit', () => {
      it('should set limit', () => {
        const criteria = Criteria.empty().withLimit(25);
        expect(criteria.limit).toBe(25);
      });

      it('should validate limit', () => {
        const criteria = Criteria.empty().withLimit(500);
        expect(criteria.limit).toBe(100);
      });

      it('should not mutate original criteria', () => {
        const original = Criteria.empty();
        const modified = original.withLimit(25);
        expect(original.limit).toBe(50);
        expect(modified.limit).toBe(25);
      });
    });

    describe('withCursor', () => {
      it('should set cursor', () => {
        const criteria = Criteria.empty().withCursor('abc123');
        expect(criteria.cursor).toBe('abc123');
        expect(criteria.hasCursor()).toBe(true);
      });

      it('should clear cursor with null', () => {
        const criteria = Criteria.create({ cursor: 'abc' }).withCursor(null);
        expect(criteria.cursor).toBe(null);
        expect(criteria.hasCursor()).toBe(false);
      });
    });

    describe('chaining', () => {
      it('should support method chaining', () => {
        const criteria = Criteria.empty()
          .withEquals('author', 'John')
          .withContains('title', 'Guide')
          .orderByAsc('title')
          .withLimit(20)
          .withCursor('cursor123');

        expect(criteria.filters.count()).toBe(2);
        expect(criteria.order.isAsc()).toBe(true);
        expect(criteria.limit).toBe(20);
        expect(criteria.cursor).toBe('cursor123');
      });
    });
  });

  describe('query methods', () => {
    describe('hasFilters', () => {
      it('should return false for empty criteria', () => {
        expect(Criteria.empty().hasFilters()).toBe(false);
      });

      it('should return true when filters exist', () => {
        const criteria = Criteria.empty().withEquals('title', 'Test');
        expect(criteria.hasFilters()).toBe(true);
      });
    });

    describe('hasOrder', () => {
      it('should return false for empty criteria', () => {
        expect(Criteria.empty().hasOrder()).toBe(false);
      });

      it('should return true when order is set', () => {
        const criteria = Criteria.empty().orderByAsc('title');
        expect(criteria.hasOrder()).toBe(true);
      });
    });

    describe('hasCursor', () => {
      it('should return false when cursor is null', () => {
        expect(Criteria.empty().hasCursor()).toBe(false);
      });

      it('should return true when cursor is set', () => {
        const criteria = Criteria.create({ cursor: 'abc' });
        expect(criteria.hasCursor()).toBe(true);
      });
    });

    describe('hasSimilarityFilter', () => {
      it('should return false when no similarity filter', () => {
        const criteria = Criteria.empty().withEquals('title', 'Test');
        expect(criteria.hasSimilarityFilter()).toBe(false);
      });

      it('should return true when similarity filter exists', () => {
        const criteria = Criteria.empty().withSimilarTo('embedding', 'query');
        expect(criteria.hasSimilarityFilter()).toBe(true);
      });
    });

    describe('getSimilarityText', () => {
      it('should return null when no similarity filter', () => {
        const criteria = Criteria.empty();
        expect(criteria.getSimilarityText()).toBe(null);
      });

      it('should return text from similarity filter', () => {
        const criteria = Criteria.empty().withSimilarTo(
          'embedding',
          'search query',
        );
        expect(criteria.getSimilarityText()).toBe('search query');
      });
    });
  });

  describe('static helpers', () => {
    describe('getDefaultLimit', () => {
      it('should return 50', () => {
        expect(Criteria.getDefaultLimit()).toBe(50);
      });
    });

    describe('getMaxLimit', () => {
      it('should return 100', () => {
        expect(Criteria.getMaxLimit()).toBe(100);
      });
    });
  });

  describe('equals', () => {
    it('should return true for identical criteria', () => {
      const criteria1 = Criteria.empty()
        .withEquals('title', 'Test')
        .orderByAsc('title')
        .withLimit(25)
        .withCursor('abc');

      const criteria2 = Criteria.empty()
        .withEquals('title', 'Test')
        .orderByAsc('title')
        .withLimit(25)
        .withCursor('abc');

      expect(criteria1.equals(criteria2)).toBe(true);
    });

    it('should return false for different filters', () => {
      const criteria1 = Criteria.empty().withEquals('title', 'Test1');
      const criteria2 = Criteria.empty().withEquals('title', 'Test2');
      expect(criteria1.equals(criteria2)).toBe(false);
    });

    it('should return false for different order', () => {
      const criteria1 = Criteria.empty().orderByAsc('title');
      const criteria2 = Criteria.empty().orderByDesc('title');
      expect(criteria1.equals(criteria2)).toBe(false);
    });

    it('should return false for different limit', () => {
      const criteria1 = Criteria.create({ limit: 10 });
      const criteria2 = Criteria.create({ limit: 20 });
      expect(criteria1.equals(criteria2)).toBe(false);
    });

    it('should return false for different cursor', () => {
      const criteria1 = Criteria.create({ cursor: 'abc' });
      const criteria2 = Criteria.create({ cursor: 'xyz' });
      expect(criteria1.equals(criteria2)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return minimal string for empty criteria', () => {
      const criteria = Criteria.empty();
      expect(criteria.toString()).toBe('LIMIT 50');
    });

    it('should include WHERE clause for filters', () => {
      const criteria = Criteria.empty().withEquals('title', 'Test');
      expect(criteria.toString()).toContain('WHERE');
    });

    it('should include ORDER BY for ordered criteria', () => {
      const criteria = Criteria.empty().orderByAsc('title');
      expect(criteria.toString()).toContain('ORDER BY title ASC');
    });

    it('should include CURSOR when set', () => {
      const criteria = Criteria.create({ cursor: 'abc123' });
      expect(criteria.toString()).toContain('CURSOR abc123');
    });

    it('should include all parts in full criteria', () => {
      const criteria = Criteria.empty()
        .withEquals('author', 'John')
        .orderByAsc('title')
        .withLimit(25)
        .withCursor('cursor123');

      const str = criteria.toString();
      expect(str).toContain('WHERE');
      expect(str).toContain('ORDER BY');
      expect(str).toContain('LIMIT 25');
      expect(str).toContain('CURSOR cursor123');
    });
  });

  describe('immutability', () => {
    it('should be frozen', () => {
      const criteria = Criteria.empty();
      expect(Object.isFrozen(criteria)).toBe(true);
    });

    it('should not allow property modification', () => {
      const criteria = Criteria.empty();
      expect(() => {
        // @ts-expect-error - Testing runtime immutability
        criteria.limit = 999;
      }).toThrow();
    });
  });
});
