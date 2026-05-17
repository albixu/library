/**
 * BookId Value Object
 *
 * Represents a unique identifier for a Book in the digital library, backed by a UUID v4.
 *
 * Value Objects are:
 * - Immutable
 * - Compared by value, not identity
 * - Self-validating
 *
 * HU-039: BookId VO for favorites and downloads domain.
 */

import { InvalidUUIDError } from '../../errors/DomainErrors.js';
import { isValidUUID } from '../../validators/index.js';
import { randomUUID } from 'crypto';

export class BookId {
  private constructor(public readonly value: string) {
    Object.freeze(this);
  }

  /**
   * Creates a BookId from an existing UUID string with validation.
   * @throws InvalidUUIDError if the value is not a valid UUID v4
   */
  static create(value: string): BookId {
    if (!value || value.trim().length === 0) {
      throw new InvalidUUIDError(value);
    }

    const trimmed = value.trim();

    if (!isValidUUID(trimmed)) {
      throw new InvalidUUIDError(value);
    }

    return new BookId(trimmed);
  }

  /**
   * Generates a new BookId with a freshly generated UUID v4.
   */
  static generate(): BookId {
    return new BookId(randomUUID());
  }

  /**
   * Creates a BookId from a known valid value (no validation).
   * Use only when the value comes from a trusted source (e.g., database).
   */
  static fromPersistence(value: string): BookId {
    return new BookId(value);
  }

  /**
   * Compares two BookId instances by value.
   */
  equals(other: BookId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
