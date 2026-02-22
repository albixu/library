/**
 * Criteria Value Object
 *
 * The main entry point for building search criteria.
 * Combines filters, ordering, and pagination (limit + cursor).
 *
 * This is a Domain Value Object following DDD principles:
 * - Immutable
 * - Self-validating
 * - Infrastructure-agnostic (repositories translate to DB queries)
 */

import { Filters } from './Filters.js';
import { Filter } from './Filter.js';
import { Order } from './Order.js';
import { PAGINATION } from './constants.js';
import type { FilterValueType } from './FilterValue.js';

/**
 * Props for creating a Criteria
 */
export interface CriteriaProps {
  filters?: Filters;
  order?: Order;
  limit?: number;
  cursor?: string | null;
}

/**
 * Criteria Value Object
 *
 * Encapsulates all search parameters: filters, ordering, and pagination.
 * Use the builder methods for a fluent API.
 */
export class Criteria {
  public readonly filters: Filters;
  public readonly order: Order;
  public readonly limit: number;
  public readonly cursor: string | null;

  private constructor(props: Required<CriteriaProps>) {
    this.filters = props.filters;
    this.order = props.order;
    this.limit = props.limit;
    this.cursor = props.cursor;
    Object.freeze(this);
  }

  /**
   * Creates a new Criteria with the given options
   */
  static create(props: CriteriaProps = {}): Criteria {
    const limit = Criteria.validateLimit(
      props.limit ?? PAGINATION.DEFAULT_LIMIT,
    );

    return new Criteria({
      filters: props.filters ?? Filters.none(),
      order: props.order ?? Order.none(),
      limit,
      cursor: props.cursor ?? null,
    });
  }

  /**
   * Creates an empty Criteria (no filters, no order, default pagination)
   */
  static empty(): Criteria {
    return Criteria.create();
  }

  /**
   * Creates a Criteria with only filters
   */
  static withFilters(filters: Filters): Criteria {
    return Criteria.create({ filters });
  }

  // ==================== Builder Methods ====================

  /**
   * Returns a new Criteria with an added EQUALS filter
   */
  withEquals(field: string, value: FilterValueType): Criteria {
    return new Criteria({
      filters: this.filters.add(Filter.equals(field, value)),
      order: this.order,
      limit: this.limit,
      cursor: this.cursor,
    });
  }

  /**
   * Returns a new Criteria with an added CONTAINS filter
   */
  withContains(field: string, value: string): Criteria {
    return new Criteria({
      filters: this.filters.add(Filter.contains(field, value)),
      order: this.order,
      limit: this.limit,
      cursor: this.cursor,
    });
  }

  /**
   * Returns a new Criteria with an added IN filter
   */
  withIn(field: string, values: string[]): Criteria {
    return new Criteria({
      filters: this.filters.add(Filter.in(field, values)),
      order: this.order,
      limit: this.limit,
      cursor: this.cursor,
    });
  }

  /**
   * Returns a new Criteria with an added SIMILAR_TO filter
   */
  withSimilarTo(field: string, value: string): Criteria {
    return new Criteria({
      filters: this.filters.add(Filter.similarTo(field, value)),
      order: this.order,
      limit: this.limit,
      cursor: this.cursor,
    });
  }

  /**
   * Returns a new Criteria with a custom filter
   */
  withFilter(filter: Filter): Criteria {
    return new Criteria({
      filters: this.filters.add(filter),
      order: this.order,
      limit: this.limit,
      cursor: this.cursor,
    });
  }

  /**
   * Returns a new Criteria with multiple filters
   */
  withFilters(filters: Filter[]): Criteria {
    return new Criteria({
      filters: this.filters.addAll(filters),
      order: this.order,
      limit: this.limit,
      cursor: this.cursor,
    });
  }

  /**
   * Returns a new Criteria with the specified order
   */
  withOrder(order: Order): Criteria {
    return new Criteria({
      filters: this.filters,
      order,
      limit: this.limit,
      cursor: this.cursor,
    });
  }

  /**
   * Returns a new Criteria with ascending order
   */
  orderByAsc(field: string): Criteria {
    return this.withOrder(Order.asc(field));
  }

  /**
   * Returns a new Criteria with descending order
   */
  orderByDesc(field: string): Criteria {
    return this.withOrder(Order.desc(field));
  }

  /**
   * Returns a new Criteria with the specified limit
   */
  withLimit(limit: number): Criteria {
    return new Criteria({
      filters: this.filters,
      order: this.order,
      limit: Criteria.validateLimit(limit),
      cursor: this.cursor,
    });
  }

  /**
   * Returns a new Criteria with the specified cursor
   */
  withCursor(cursor: string | null): Criteria {
    return new Criteria({
      filters: this.filters,
      order: this.order,
      limit: this.limit,
      cursor,
    });
  }

  // ==================== Query Methods ====================

  /**
   * Checks if any filters are defined
   */
  hasFilters(): boolean {
    return !this.filters.isEmpty();
  }

  /**
   * Checks if an order is defined
   */
  hasOrder(): boolean {
    return !this.order.isNone();
  }

  /**
   * Checks if a cursor is defined
   */
  hasCursor(): boolean {
    return this.cursor !== null;
  }

  /**
   * Checks if a similarity filter is present
   */
  hasSimilarityFilter(): boolean {
    return this.filters.hasSimilarityFilter();
  }

  /**
   * Gets the similarity filter text value if present
   */
  getSimilarityText(): string | null {
    const filter = this.filters.getSimilarityFilter();
    if (!filter) {return null;}

    const value = filter.value.value;
    return typeof value === 'string' ? value : null;
  }

  // ==================== Static Helpers ====================

  /**
   * Validates and constrains the limit value
   */
  private static validateLimit(limit: number): number {
    if (limit < PAGINATION.MIN_LIMIT) {
      return PAGINATION.MIN_LIMIT;
    }
    if (limit > PAGINATION.MAX_LIMIT) {
      return PAGINATION.MAX_LIMIT;
    }
    return Math.floor(limit);
  }

  /**
   * Returns the default limit value
   */
  static getDefaultLimit(): number {
    return PAGINATION.DEFAULT_LIMIT;
  }

  /**
   * Returns the maximum allowed limit
   */
  static getMaxLimit(): number {
    return PAGINATION.MAX_LIMIT;
  }

  equals(other: Criteria): boolean {
    return (
      this.filters.equals(other.filters) &&
      this.order.equals(other.order) &&
      this.limit === other.limit &&
      this.cursor === other.cursor
    );
  }

  toString(): string {
    const parts: string[] = [];

    if (this.hasFilters()) {
      parts.push(`WHERE ${this.filters.toString()}`);
    }

    if (this.hasOrder()) {
      parts.push(`ORDER BY ${this.order.toString()}`);
    }

    parts.push(`LIMIT ${this.limit}`);

    if (this.hasCursor()) {
      parts.push(`CURSOR ${this.cursor}`);
    }

    return parts.join(' ');
  }
}
