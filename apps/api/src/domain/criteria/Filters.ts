/**
 * Filters Value Object
 *
 * Represents a collection of Filter conditions that are combined with AND logic.
 * This is an immutable collection that allows building filter chains.
 */

import type { Filter } from './Filter.js';

/**
 * Filters Value Object
 *
 * A collection of filters to apply when searching.
 * All filters are combined with AND logic.
 * Immutable - operations return new instances.
 */
export class Filters {
  private constructor(private readonly items: readonly Filter[]) {
    Object.freeze(this);
  }

  /**
   * Creates an empty Filters collection
   */
  static none(): Filters {
    return new Filters([]);
  }

  /**
   * Creates a Filters collection from an array of filters
   */
  static fromValues(filters: Filter[]): Filters {
    return new Filters(Object.freeze([...filters]));
  }

  /**
   * Creates a Filters collection from a single filter
   */
  static from(filter: Filter): Filters {
    return new Filters([filter]);
  }

  /**
   * Returns a new Filters collection with the added filter
   */
  add(filter: Filter): Filters {
    return new Filters([...this.items, filter]);
  }

  /**
   * Returns a new Filters collection with multiple filters added
   */
  addAll(filters: Filter[]): Filters {
    return new Filters([...this.items, ...filters]);
  }

  /**
   * Checks if the collection is empty
   */
  isEmpty(): boolean {
    return this.items.length === 0;
  }

  /**
   * Returns the number of filters
   */
  count(): number {
    return this.items.length;
  }

  /**
   * Finds a filter by field name
   */
  getByField(fieldName: string): Filter | undefined {
    return this.items.find(filter => filter.field.value === fieldName);
  }

  /**
   * Checks if a filter exists for the given field
   */
  hasField(fieldName: string): boolean {
    return this.items.some(filter => filter.field.value === fieldName);
  }

  /**
   * Checks if any filter uses semantic similarity
   */
  hasSimilarityFilter(): boolean {
    return this.items.some(filter => filter.isSimilarityFilter());
  }

  /**
   * Gets the similarity filter if present
   */
  getSimilarityFilter(): Filter | undefined {
    return this.items.find(filter => filter.isSimilarityFilter());
  }

  /**
   * Returns all filters except similarity filters
   */
  withoutSimilarityFilters(): Filters {
    return new Filters(
      this.items.filter(filter => !filter.isSimilarityFilter()),
    );
  }

  /**
   * Returns all filters as an array
   */
  getAll(): readonly Filter[] {
    return this.items;
  }

  /**
   * Iterates over all filters
   */
  forEach(callback: (filter: Filter, index: number) => void): void {
    this.items.forEach(callback);
  }

  /**
   * Maps filters to a new array
   */
  map<T>(callback: (filter: Filter, index: number) => T): T[] {
    return this.items.map(callback);
  }

  /**
   * Filters the collection based on a predicate and returns a new Filters instance
   */
  filter(predicate: (filter: Filter, index: number) => boolean): Filters {
    return new Filters(this.items.filter(predicate));
  }

  equals(other: Filters): boolean {
    if (this.items.length !== other.items.length) {
      return false;
    }

    return this.items.every((filter, index) => {
      const otherFilter = other.items[index];
      return otherFilter !== undefined && filter.equals(otherFilter);
    });
  }

  toString(): string {
    if (this.isEmpty()) {
      return '(no filters)';
    }
    return this.items.map(f => f.toString()).join(' AND ');
  }
}
