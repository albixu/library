/**
 * ISBN Value Object
 *
 * Represents an International Standard Book Number.
 * Supports both ISBN-10 and ISBN-13 formats.
 *
 * Value Objects are:
 * - Immutable
 * - Compared by value, not identity
 * - Self-validating
 */

export class ISBN {
  private constructor(public readonly value: string) {
    Object.freeze(this);
  }

  /**
   * Creates a new ISBN instance
   * @throws InvalidISBNError if the value is not a valid ISBN
   */
  static create(value: string): ISBN {
    const normalized = ISBN.normalize(value);

    if (!ISBN.isValid(normalized)) {
      throw new InvalidISBNError(value);
    }

    return new ISBN(normalized);
  }

  /**
   * Creates an ISBN from a known valid value (no validation)
   * Use only when the value comes from a trusted source (e.g., database)
   */
  static fromPersistence(value: string): ISBN {
    return new ISBN(value);
  }

  /**
   * Removes hyphens and spaces from ISBN
   */
  private static normalize(value: string): string {
    return value.replace(/[-\s]/g, '').toUpperCase();
  }

  /**
   * Validates an ISBN (both ISBN-10 and ISBN-13)
   */
  static isValid(value: string): boolean {
    const normalized = ISBN.normalize(value);

    if (normalized.length === 10) {
      return ISBN.isValidISBN10(normalized);
    }

    if (normalized.length === 13) {
      return ISBN.isValidISBN13(normalized);
    }

    return false;
  }

  /**
   * Validates ISBN-10 checksum
   * Formula: (10*d1 + 9*d2 + 8*d3 + ... + 1*d10) mod 11 = 0
   */
  private static isValidISBN10(isbn: string): boolean {
    if (!/^[\dX]{10}$/.test(isbn)) {
      return false;
    }

    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += (10 - i) * parseInt(isbn[i], 10);
    }

    // Last digit can be 'X' representing 10
    const lastChar = isbn[9];
    const lastDigit = lastChar === 'X' ? 10 : parseInt(lastChar, 10);
    sum += lastDigit;

    return sum % 11 === 0;
  }

  /**
   * Validates ISBN-13 checksum
   * Formula: (d1 + 3*d2 + d3 + 3*d4 + ... + d13) mod 10 = 0
   */
  private static isValidISBN13(isbn: string): boolean {
    if (!/^\d{13}$/.test(isbn)) {
      return false;
    }

    let sum = 0;
    for (let i = 0; i < 13; i++) {
      const digit = parseInt(isbn[i], 10);
      sum += i % 2 === 0 ? digit : digit * 3;
    }

    return sum % 10 === 0;
  }

  /**
   * Returns the ISBN type (ISBN-10 or ISBN-13)
   */
  getType(): 'ISBN-10' | 'ISBN-13' {
    return this.value.length === 10 ? 'ISBN-10' : 'ISBN-13';
  }

  /**
   * Formats the ISBN with hyphens (simplified format)
   */
  toFormattedString(): string {
    if (this.value.length === 13) {
      // ISBN-13: 978-X-XXXX-XXXX-X (simplified)
      return `${this.value.slice(0, 3)}-${this.value.slice(3, 4)}-${this.value.slice(4, 8)}-${this.value.slice(8, 12)}-${this.value.slice(12)}`;
    }
    // ISBN-10: X-XXXX-XXXX-X (simplified)
    return `${this.value.slice(0, 1)}-${this.value.slice(1, 5)}-${this.value.slice(5, 9)}-${this.value.slice(9)}`;
  }

  /**
   * Compares two ISBN instances
   */
  equals(other: ISBN): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

/**
 * Error thrown when an invalid ISBN is provided
 */
export class InvalidISBNError extends Error {
  constructor(value: string) {
    super(
      `Invalid ISBN: "${value}". Must be a valid ISBN-10 or ISBN-13 with correct checksum.`
    );
    this.name = 'InvalidISBNError';
  }
}
