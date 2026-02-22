/**
 * OrderBy Value Object
 *
 * Represents the field name to sort by.
 */

/**
 * OrderBy Value Object
 *
 * Represents the field used for ordering results.
 * Immutable and self-validating.
 */
export class OrderBy {
  private constructor(public readonly value: string) {
    Object.freeze(this);
  }

  /**
   * Creates an OrderBy from a string value
   * @throws InvalidOrderByError if the field name is empty
   */
  static create(value: string): OrderBy {
    const trimmed = value.trim();

    if (trimmed.length === 0) {
      throw new InvalidOrderByError(value);
    }

    return new OrderBy(trimmed);
  }

  /**
   * Creates an OrderBy from a known valid value (no validation)
   */
  static fromPersistence(value: string): OrderBy {
    return new OrderBy(value);
  }

  /**
   * Creates a "none" OrderBy for cases with no ordering
   */
  static none(): OrderBy {
    return new OrderBy('');
  }

  /**
   * Checks if this represents no ordering
   */
  isNone(): boolean {
    return this.value === '';
  }

  equals(other: OrderBy): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

/**
 * Error thrown when an invalid order by field is provided
 */
export class InvalidOrderByError extends Error {
  constructor(_value: string) {
    super('Invalid order by field: field name cannot be empty');
    this.name = 'InvalidOrderByError';
  }
}
