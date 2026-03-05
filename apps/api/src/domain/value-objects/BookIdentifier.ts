/**
 * BookIdentifier Value Object
 *
 * Represents a unique identifier for a book in the library catalog.
 * Supports standard ISBN-10 and ISBN-13 formats as well as proprietary
 * identifiers used by publishers and distributors (e.g. MIT Sloan alphanumeric
 * codes, institutional short codes, etc.).
 *
 * Validation rules:
 * - Non-empty after trimming whitespace
 * - Length: 1–32 characters
 * - Allowed characters: alphanumeric (A-Z, 0-9), hyphens (-) and underscores (_)
 * - Normalized to uppercase
 * - Hyphens and spaces are stripped before validation when they act as
 *   separators (i.e. the remaining value must still pass the rules above)
 *
 * Value Objects are:
 * - Immutable
 * - Compared by value, not identity
 * - Self-validating
 */

import { DomainError } from '../errors/DomainErrors.js';

export class BookIdentifier {
  private constructor(public readonly value: string) {
    Object.freeze(this);
  }

  /**
   * Creates a new BookIdentifier instance from user input.
   * Strips hyphens and spaces (common ISBN separators) then validates
   * the remaining string against the allowed character set and length.
   *
   * @throws InvalidBookIdentifierError if the value does not meet the rules
   */
  static create(value: string): BookIdentifier {
    const normalized = BookIdentifier.normalize(value);

    if (!BookIdentifier.isValidNormalized(normalized)) {
      throw new InvalidBookIdentifierError(value);
    }

    return new BookIdentifier(normalized);
  }

  /**
   * Creates a BookIdentifier from a known valid value (no validation).
   * Use only when the value comes from a trusted source (e.g. database).
   */
  static fromPersistence(value: string): BookIdentifier {
    return new BookIdentifier(value);
  }

  /**
   * Normalizes a raw identifier string:
   * - Strips leading/trailing whitespace
   * - Removes hyphens and spaces (ISBN separator characters)
   * - Converts to uppercase
   */
  private static normalize(value: string): string {
    return value.trim().replace(/[-\s]/g, '').toUpperCase();
  }

  /**
   * Validates a pre-normalized identifier string.
   * Expects the value to already be trimmed, separator-free and uppercased.
   */
  private static isValidNormalized(value: string): boolean {
    if (value.length === 0 || value.length > 32) {
      return false;
    }

    // Only alphanumeric characters, hyphens and underscores are allowed.
    // Note: hyphens have already been stripped by normalize(), so what
    // remains here must be purely alphanumeric or underscore.
    return /^[A-Z0-9_]+$/.test(value);
  }

  /**
   * Compares two BookIdentifier instances by value.
   */
  equals(other: BookIdentifier): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

/**
 * Error thrown when an invalid book identifier is provided.
 */
export class InvalidBookIdentifierError extends DomainError {
  constructor(value: string) {
    super(
      `Invalid book identifier: "${value}". Must be 1-32 alphanumeric characters (hyphens and underscores allowed).`,
    );
  }
}
