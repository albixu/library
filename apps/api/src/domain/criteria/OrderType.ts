/**
 * OrderType Enum
 *
 * Defines the sort direction for ordering results.
 */

/**
 * Available order types
 */
export const ORDER_TYPES = ['ASC', 'DESC', 'NONE'] as const;

export type OrderTypeValue = (typeof ORDER_TYPES)[number];

/**
 * OrderType Value Object
 *
 * Represents the direction of sorting (ascending or descending).
 * Immutable and self-validating.
 */
export class OrderType {
  private constructor(public readonly value: OrderTypeValue) {
    Object.freeze(this);
  }

  static readonly ASC = new OrderType('ASC');
  static readonly DESC = new OrderType('DESC');
  static readonly NONE = new OrderType('NONE');

  /**
   * Creates an OrderType from a string value
   * @throws InvalidOrderTypeError if the value is not valid
   */
  static fromValue(value: string): OrderType {
    const upperValue = value.toUpperCase();

    if (!OrderType.isValid(upperValue)) {
      throw new InvalidOrderTypeError(value);
    }

    return new OrderType(upperValue as OrderTypeValue);
  }

  /**
   * Checks if a value is a valid order type
   */
  static isValid(value: string): value is OrderTypeValue {
    return ORDER_TYPES.includes(value as OrderTypeValue);
  }

  /**
   * Checks if this represents no ordering
   */
  isNone(): boolean {
    return this.value === 'NONE';
  }

  /**
   * Checks if this is ascending order
   */
  isAsc(): boolean {
    return this.value === 'ASC';
  }

  /**
   * Checks if this is descending order
   */
  isDesc(): boolean {
    return this.value === 'DESC';
  }

  equals(other: OrderType): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

/**
 * Error thrown when an invalid order type is provided
 */
export class InvalidOrderTypeError extends Error {
  constructor(value: string) {
    super(
      `Invalid order type: "${value}". Valid types are: ${ORDER_TYPES.join(', ')}`,
    );
    this.name = 'InvalidOrderTypeError';
  }
}
