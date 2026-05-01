/**
 * EmailAddress Value Object
 *
 * Represents a valid email address.
 *
 * Value Objects are:
 * - Immutable
 * - Compared by value, not identity
 * - Self-validating
 */

import { DomainError } from '../errors/DomainErrors.js';

export class EmailAddress {
  private constructor(public readonly value: string) {
    Object.freeze(this);
  }

  /**
   * Creates a new EmailAddress instance
   * @throws InvalidEmailAddressError if the value is not a valid email address
   */
  static create(value: string): EmailAddress {
    if (!value || value.trim().length === 0) {
      throw new InvalidEmailAddressError(value);
    }

    const trimmed = value.trim();

    if (!EmailAddress.isValid(trimmed)) {
      throw new InvalidEmailAddressError(value);
    }

    return new EmailAddress(trimmed);
  }

  /**
   * Creates an EmailAddress from a known valid value (no validation)
   * Use only when the value comes from a trusted source (e.g., database)
   */
  static fromPersistence(value: string): EmailAddress {
    return new EmailAddress(value);
  }

  /**
   * Validates an email address format
   * Uses RFC 5322 simplified regex — no Zod, pure domain logic
   */
  static isValid(value: string): boolean {
    // Simplified but robust email regex covering common cases
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  }

  /**
   * Compares two EmailAddress instances
   */
  equals(other: EmailAddress): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

/**
 * Error thrown when an invalid email address is provided
 */
export class InvalidEmailAddressError extends DomainError {
  constructor(value: string) {
    super(
      `Invalid email address: "${value}". Must be a valid email format (e.g., user@example.com).`,
    );
  }
}
