/**
 * FilterField Value Object
 *
 * Represents the name of a field to filter on.
 * This is a simple wrapper that ensures the field name is valid.
 */

/**
 * FilterField Value Object
 *
 * Represents the name of a field that can be used in filters.
 * Immutable and self-validating.
 */
export class FilterField {
  private constructor(public readonly value: string) {
    Object.freeze(this);
  }

  /**
   * Creates a FilterField from a string value
   * @throws InvalidFilterFieldError if the field name is empty
   */
  static create(value: string): FilterField {
    const trimmed = value.trim();

    if (trimmed.length === 0) {
      throw new InvalidFilterFieldError(value);
    }

    return new FilterField(trimmed);
  }

  /**
   * Creates a FilterField from a known valid value (no validation)
   */
  static fromPersistence(value: string): FilterField {
    return new FilterField(value);
  }

  equals(other: FilterField): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

/**
 * Error thrown when an invalid filter field is provided
 */
export class InvalidFilterFieldError extends Error {
  constructor(_value: string) {
    super('Invalid filter field: field name cannot be empty');
    this.name = 'InvalidFilterFieldError';
  }
}
