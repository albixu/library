/**
 * FilterValue Value Object
 *
 * Represents the value to filter by.
 * Supports multiple types: string, number, boolean, string array, and number array.
 */

/**
 * Primitive types that can be used as filter values
 */
export type FilterPrimitiveValue = string | number | boolean;

/**
 * All types that can be used as filter values
 */
export type FilterValueType = FilterPrimitiveValue | FilterPrimitiveValue[];

/**
 * FilterValue Value Object
 *
 * Wraps the value to be used in filter comparisons.
 * Immutable and type-safe.
 */
export class FilterValue {
  private constructor(public readonly value: FilterValueType) {
    Object.freeze(this);
  }

  /**
   * Creates a FilterValue from any supported type
   */
  static create(value: FilterValueType): FilterValue {
    if (value === null || value === undefined) {
      throw new InvalidFilterValueError('Filter value cannot be null or undefined');
    }

    // For arrays, create a frozen copy
    if (Array.isArray(value)) {
      if (value.length === 0) {
        throw new InvalidFilterValueError('Filter value array cannot be empty');
      }
      return new FilterValue(Object.freeze([...value]) as FilterPrimitiveValue[]);
    }

    return new FilterValue(value);
  }

  /**
   * Checks if the value is an array
   */
  isArray(): boolean {
    return Array.isArray(this.value);
  }

  /**
   * Checks if the value is a string
   */
  isString(): boolean {
    return typeof this.value === 'string';
  }

  /**
   * Checks if the value is a number
   */
  isNumber(): boolean {
    return typeof this.value === 'number';
  }

  /**
   * Checks if the value is a boolean
   */
  isBoolean(): boolean {
    return typeof this.value === 'boolean';
  }

  /**
   * Returns the value as a string array (throws if not an array)
   */
  asStringArray(): string[] {
    if (!Array.isArray(this.value)) {
      throw new Error('FilterValue is not an array');
    }
    return this.value as string[];
  }

  equals(other: FilterValue): boolean {
    if (this.isArray() && other.isArray()) {
      const thisArray = this.value as FilterPrimitiveValue[];
      const otherArray = other.value as FilterPrimitiveValue[];

      if (thisArray.length !== otherArray.length) {
        return false;
      }

      return thisArray.every((val, idx) => val === otherArray[idx]);
    }

    return this.value === other.value;
  }

  toString(): string {
    if (Array.isArray(this.value)) {
      return `[${this.value.join(', ')}]`;
    }
    return String(this.value);
  }
}

/**
 * Error thrown when an invalid filter value is provided
 */
export class InvalidFilterValueError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidFilterValueError';
  }
}
