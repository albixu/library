import { describe, it, expect } from 'vitest';
import { Filters } from '../../../../src/domain/criteria/Filters.js';
import { Filter } from '../../../../src/domain/criteria/Filter.js';

describe('Filters', () => {
  describe('none', () => {
    it('should create an empty filters collection', () => {
      const filters = Filters.none();
      expect(filters.isEmpty()).toBe(true);
      expect(filters.count()).toBe(0);
    });
  });

  describe('fromValues', () => {
    it('should create filters from array', () => {
      const filter1 = Filter.equals('title', 'test');
      const filter2 = Filter.contains('author', 'martin');

      const filters = Filters.fromValues([filter1, filter2]);

      expect(filters.count()).toBe(2);
      expect(filters.isEmpty()).toBe(false);
    });

    it('should create empty filters from empty array', () => {
      const filters = Filters.fromValues([]);
      expect(filters.isEmpty()).toBe(true);
    });
  });

  describe('from', () => {
    it('should create filters from single filter', () => {
      const filter = Filter.equals('title', 'test');
      const filters = Filters.from(filter);

      expect(filters.count()).toBe(1);
      expect(filters.getByField('title')).toBeDefined();
    });
  });

  describe('add', () => {
    it('should return new Filters with added filter', () => {
      const original = Filters.none();
      const filter = Filter.equals('title', 'test');

      const updated = original.add(filter);

      expect(original.isEmpty()).toBe(true);
      expect(updated.count()).toBe(1);
    });

    it('should accumulate filters', () => {
      const filters = Filters.none()
        .add(Filter.equals('title', 'test'))
        .add(Filter.contains('author', 'martin'))
        .add(Filter.in('types', ['technical']));

      expect(filters.count()).toBe(3);
    });
  });

  describe('addAll', () => {
    it('should add multiple filters at once', () => {
      const original = Filters.from(Filter.equals('title', 'test'));
      const newFilters = [
        Filter.contains('author', 'martin'),
        Filter.in('types', ['technical']),
      ];

      const updated = original.addAll(newFilters);

      expect(updated.count()).toBe(3);
    });
  });

  describe('getByField', () => {
    it('should return filter by field name', () => {
      const filter = Filter.equals('title', 'Clean Code');
      const filters = Filters.from(filter);

      const found = filters.getByField('title');

      expect(found).toBeDefined();
      expect(found?.field.value).toBe('title');
    });

    it('should return undefined for non-existent field', () => {
      const filters = Filters.from(Filter.equals('title', 'test'));
      expect(filters.getByField('author')).toBeUndefined();
    });
  });

  describe('hasField', () => {
    it('should return true when field exists', () => {
      const filters = Filters.from(Filter.equals('title', 'test'));
      expect(filters.hasField('title')).toBe(true);
    });

    it('should return false when field does not exist', () => {
      const filters = Filters.from(Filter.equals('title', 'test'));
      expect(filters.hasField('author')).toBe(false);
    });
  });

  describe('hasSimilarityFilter', () => {
    it('should return true when similarity filter exists', () => {
      const filters = Filters.from(Filter.similarTo('embedding', 'search text'));
      expect(filters.hasSimilarityFilter()).toBe(true);
    });

    it('should return false when no similarity filter', () => {
      const filters = Filters.from(Filter.equals('title', 'test'));
      expect(filters.hasSimilarityFilter()).toBe(false);
    });
  });

  describe('getSimilarityFilter', () => {
    it('should return similarity filter when exists', () => {
      const similarityFilter = Filter.similarTo('embedding', 'search text');
      const filters = Filters.fromValues([
        Filter.equals('title', 'test'),
        similarityFilter,
      ]);

      const found = filters.getSimilarityFilter();

      expect(found).toBeDefined();
      expect(found?.value.value).toBe('search text');
    });

    it('should return undefined when no similarity filter', () => {
      const filters = Filters.from(Filter.equals('title', 'test'));
      expect(filters.getSimilarityFilter()).toBeUndefined();
    });
  });

  describe('withoutSimilarityFilters', () => {
    it('should return filters without similarity filters', () => {
      const filters = Filters.fromValues([
        Filter.equals('title', 'test'),
        Filter.similarTo('embedding', 'search text'),
        Filter.contains('author', 'martin'),
      ]);

      const withoutSimilarity = filters.withoutSimilarityFilters();

      expect(withoutSimilarity.count()).toBe(2);
      expect(withoutSimilarity.hasSimilarityFilter()).toBe(false);
    });
  });

  describe('getAll', () => {
    it('should return all filters as readonly array', () => {
      const filter1 = Filter.equals('title', 'test');
      const filter2 = Filter.contains('author', 'martin');
      const filters = Filters.fromValues([filter1, filter2]);

      const all = filters.getAll();

      expect(all.length).toBe(2);
      expect(all[0]).toBe(filter1);
      expect(all[1]).toBe(filter2);
    });
  });

  describe('forEach', () => {
    it('should iterate over all filters', () => {
      const filters = Filters.fromValues([
        Filter.equals('a', '1'),
        Filter.equals('b', '2'),
      ]);

      const fields: string[] = [];
      filters.forEach(filter => fields.push(filter.field.value));

      expect(fields).toEqual(['a', 'b']);
    });
  });

  describe('map', () => {
    it('should map filters to new array', () => {
      const filters = Filters.fromValues([
        Filter.equals('title', 'test'),
        Filter.contains('author', 'martin'),
      ]);

      const fieldNames = filters.map(f => f.field.value);

      expect(fieldNames).toEqual(['title', 'author']);
    });
  });

  describe('equals', () => {
    it('should return true for identical filters collections', () => {
      const filters1 = Filters.fromValues([
        Filter.equals('title', 'test'),
        Filter.contains('author', 'martin'),
      ]);
      const filters2 = Filters.fromValues([
        Filter.equals('title', 'test'),
        Filter.contains('author', 'martin'),
      ]);

      expect(filters1.equals(filters2)).toBe(true);
    });

    it('should return false for different count', () => {
      const filters1 = Filters.from(Filter.equals('title', 'test'));
      const filters2 = Filters.fromValues([
        Filter.equals('title', 'test'),
        Filter.contains('author', 'martin'),
      ]);

      expect(filters1.equals(filters2)).toBe(false);
    });

    it('should return false for different filters', () => {
      const filters1 = Filters.from(Filter.equals('title', 'test'));
      const filters2 = Filters.from(Filter.equals('title', 'other'));

      expect(filters1.equals(filters2)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return descriptive string for empty filters', () => {
      const filters = Filters.none();
      expect(filters.toString()).toBe('(no filters)');
    });

    it('should return AND-joined string for multiple filters', () => {
      const filters = Filters.fromValues([
        Filter.equals('title', 'test'),
        Filter.contains('author', 'martin'),
      ]);

      expect(filters.toString()).toBe(
        'title EQUALS test AND author CONTAINS martin',
      );
    });
  });

  describe('immutability', () => {
    it('should be frozen', () => {
      const filters = Filters.none();
      expect(Object.isFrozen(filters)).toBe(true);
    });
  });
});
