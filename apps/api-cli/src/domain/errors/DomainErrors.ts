/**
 * Domain Errors
 *
 * Custom error classes for domain-specific errors.
 * These errors represent business rule violations or invalid states.
 *
 * All domain errors extend DomainError base class for easy identification.
 */

/**
 * Base class for all domain errors
 */
export abstract class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Thrown when a book is not found
 */
export class BookNotFoundError extends DomainError {
  constructor(identifier: string) {
    super(`Book not found: ${identifier}`);
  }
}

/**
 * Thrown when trying to create a book with an ISBN that already exists
 */
export class BookAlreadyExistsError extends DomainError {
  constructor(isbn: string) {
    super(`A book with ISBN "${isbn}" already exists`);
  }
}

/**
 * Thrown when a required field is missing or empty
 */
export class RequiredFieldError extends DomainError {
  constructor(fieldName: string) {
    super(`"${fieldName}" is required and cannot be empty`);
  }
}

/**
 * Thrown when a field exceeds its maximum length
 */
export class FieldTooLongError extends DomainError {
  constructor(fieldName: string, maxLength: number) {
    super(`"${fieldName}" exceeds maximum length of ${maxLength} characters`);
  }
}

/**
 * Thrown when an invalid UUID is provided
 */
export class InvalidUUIDError extends DomainError {
  constructor(value: string) {
    super(`Invalid UUID format: "${value}"`);
  }
}

/**
 * Thrown when embedding dimensions are invalid
 */
export class InvalidEmbeddingError extends DomainError {
  constructor(message: string) {
    super(`Invalid embedding: ${message}`);
  }
}
