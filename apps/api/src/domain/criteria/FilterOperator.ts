/**
 * FilterOperator Enum
 *
 * Defines the comparison operators available for filtering.
 * Each operator translates to a specific database operation.
 */

/**
 * Available filter operators
 */
export const FILTER_OPERATORS = [
  'EQUALS',
  'NOT_EQUALS',
  'CONTAINS',
  'IN',
  'GT',
  'LT',
  'GTE',
  'LTE',
  'SIMILAR_TO',
] as const;

export type FilterOperatorValue = (typeof FILTER_OPERATORS)[number];

/**
 * FilterOperator Value Object
 *
 * Represents a comparison operator for filtering data.
 * Immutable and self-validating.
 */
export class FilterOperator {
  private constructor(public readonly value: FilterOperatorValue) {
    Object.freeze(this);
  }

  static readonly EQUALS = new FilterOperator('EQUALS');
  static readonly NOT_EQUALS = new FilterOperator('NOT_EQUALS');
  static readonly CONTAINS = new FilterOperator('CONTAINS');
  static readonly IN = new FilterOperator('IN');
  static readonly GT = new FilterOperator('GT');
  static readonly LT = new FilterOperator('LT');
  static readonly GTE = new FilterOperator('GTE');
  static readonly LTE = new FilterOperator('LTE');
  static readonly SIMILAR_TO = new FilterOperator('SIMILAR_TO');

  /**
   * Creates a FilterOperator from a string value
   * @throws Error if the value is not a valid operator
   */
  static fromValue(value: string): FilterOperator {
    const upperValue = value.toUpperCase();

    if (!FilterOperator.isValid(upperValue)) {
      throw new InvalidFilterOperatorError(value);
    }

    return new FilterOperator(upperValue as FilterOperatorValue);
  }

  /**
   * Checks if a value is a valid filter operator
   */
  static isValid(value: string): value is FilterOperatorValue {
    return FILTER_OPERATORS.includes(value as FilterOperatorValue);
  }

  /**
   * Returns all valid operators
   */
  static getAllOperators(): readonly FilterOperatorValue[] {
    return FILTER_OPERATORS;
  }

  equals(other: FilterOperator): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

/**
 * Error thrown when an invalid filter operator is provided
 */
export class InvalidFilterOperatorError extends Error {
  constructor(value: string) {
    super(
      `Invalid filter operator: "${value}". Valid operators are: ${FILTER_OPERATORS.join(', ')}`,
    );
    this.name = 'InvalidFilterOperatorError';
  }
}
