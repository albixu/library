/**
 * UserId Value Object
 *
 * Represents a unique identifier for a User, backed by a UUID v4.
 *
 * Value Objects are:
 * - Immutable
 * - Compared by value, not identity
 * - Self-validating
 */

import { InvalidUUIDError } from '../../errors/DomainErrors.js';
import { isValidUUID } from '../../validators/index.js';
import { randomUUID } from 'crypto';

export class UserId {
  private constructor(public readonly value: string) {
    Object.freeze(this);
  }

  /**
   * Creates a UserId from an existing UUID string with validation.
   * @throws InvalidUUIDError if the value is not a valid UUID v4
   */
  static create(value: string): UserId {
    if (!value || value.trim().length === 0) {
      throw new InvalidUUIDError(value);
    }

    const trimmed = value.trim();

    if (!isValidUUID(trimmed)) {
      throw new InvalidUUIDError(value);
    }

    return new UserId(trimmed);
  }

  /**
   * Generates a new UserId with a freshly generated UUID v4.
   */
  static generate(): UserId {
    return new UserId(randomUUID());
  }

  /**
   * Creates a UserId from a known valid value (no validation).
   * Use only when the value comes from a trusted source (e.g., database).
   */
  static fromPersistence(value: string): UserId {
    return new UserId(value);
  }

  /**
   * Compares two UserId instances by value.
   */
  equals(other: UserId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
