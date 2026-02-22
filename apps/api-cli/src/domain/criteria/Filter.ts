/**
 * Filter Value Object
 *
 * Represents a single filter condition with field, operator, and value.
 * Filters are the basic building blocks for constructing search criteria.
 */

import { FilterField } from './FilterField.js';
import { FilterOperator, type FilterOperatorValue } from './FilterOperator.js';
import { FilterValue, type FilterValueType } from './FilterValue.js';

/**
 * Filter Value Object
 *
 * Combines field, operator, and value into a single filter condition.
 * Immutable and self-validating.
 */
export class Filter {
  private constructor(
    public readonly field: FilterField,
    public readonly operator: FilterOperator,
    public readonly value: FilterValue,
  ) {
    Object.freeze(this);
  }

  /**
   * Creates a Filter from primitive values
   */
  static create(
    field: string,
    operator: FilterOperatorValue,
    value: FilterValueType,
  ): Filter {
    return new Filter(
      FilterField.create(field),
      FilterOperator.fromValue(operator),
      FilterValue.create(value),
    );
  }

  /**
   * Creates an EQUALS filter
   */
  static equals(field: string, value: FilterValueType): Filter {
    return Filter.create(field, 'EQUALS', value);
  }

  /**
   * Creates a NOT_EQUALS filter
   */
  static notEquals(field: string, value: FilterValueType): Filter {
    return Filter.create(field, 'NOT_EQUALS', value);
  }

  /**
   * Creates a CONTAINS filter (partial match)
   */
  static contains(field: string, value: string): Filter {
    return Filter.create(field, 'CONTAINS', value);
  }

  /**
   * Creates an IN filter (value must be in array)
   */
  static in(field: string, values: string[]): Filter {
    return Filter.create(field, 'IN', values);
  }

  /**
   * Creates a SIMILAR_TO filter (semantic similarity search)
   */
  static similarTo(field: string, value: string): Filter {
    return Filter.create(field, 'SIMILAR_TO', value);
  }

  /**
   * Creates a greater than filter
   */
  static greaterThan(field: string, value: number): Filter {
    return Filter.create(field, 'GT', value);
  }

  /**
   * Creates a less than filter
   */
  static lessThan(field: string, value: number): Filter {
    return Filter.create(field, 'LT', value);
  }

  /**
   * Checks if this filter uses the SIMILAR_TO operator
   */
  isSimilarityFilter(): boolean {
    return this.operator.equals(FilterOperator.SIMILAR_TO);
  }

  equals(other: Filter): boolean {
    return (
      this.field.equals(other.field) &&
      this.operator.equals(other.operator) &&
      this.value.equals(other.value)
    );
  }

  toString(): string {
    return `${this.field.value} ${this.operator.value} ${this.value.toString()}`;
  }
}
