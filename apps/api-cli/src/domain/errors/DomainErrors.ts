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
 * Thrown when a category is not found
 */
export class CategoryNotFoundError extends DomainError {
  constructor(identifier: string) {
    super(`Category not found: ${identifier}`);
  }
}

/**
 * Thrown when trying to create a category with a name that already exists
 */
export class CategoryAlreadyExistsError extends DomainError {
  constructor(name: string) {
    super(`A category with name "${name}" already exists`);
  }
}

/**
 * Thrown when trying to create a book with an ISBN that already exists
 * @deprecated Use DuplicateISBNError for ISBN duplicates or DuplicateBookError for triad duplicates
 */
export class BookAlreadyExistsError extends DomainError {
  constructor(isbn: string) {
    super(`A book with ISBN "${isbn}" already exists`);
  }
}

/**
 * Thrown when trying to create a book with an ISBN that already exists
 * This is a specific case of duplicate detection based on ISBN uniqueness constraint
 */
export class DuplicateISBNError extends DomainError {
  constructor(isbn: string) {
    super(`A book with ISBN "${isbn}" already exists`);
  }
}

/**
 * Thrown when trying to create a book with a combination of author, title, and format
 * that already exists (triad uniqueness constraint)
 */
export class DuplicateBookError extends DomainError {
  constructor(author: string, title: string, format: string) {
    super(
      `A book with the same author, title, and format already exists: "${author}" - "${title}" (${format})`
    );
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
 * Thrown when too many items are provided in an array field
 */
export class TooManyItemsError extends DomainError {
  constructor(fieldName: string, maxItems: number) {
    super(`"${fieldName}" exceeds maximum of ${maxItems} items`);
  }
}

/**
 * Thrown when duplicate items are found in an array field
 */
export class DuplicateItemError extends DomainError {
  constructor(fieldName: string, duplicateValue: string) {
    super(`Duplicate value "${duplicateValue}" in "${fieldName}"`);
  }
}

/**
 * Thrown when an invalid book type is provided
 */
export class InvalidBookTypeError extends DomainError {
  constructor(value: string, validTypes?: readonly string[]) {
    const validTypesMessage = validTypes
      ? `. Valid types are: ${validTypes.join(', ')}`
      : '';
    super(`Invalid book type: "${value}"${validTypesMessage}`);
  }
}

// ==================== Application/Infrastructure Errors ====================

/**
 * Base class for embedding service errors
 */
export abstract class EmbeddingServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Thrown when the embedding service is not available (connection error, timeout, etc.)
 * This should result in a 503 Service Unavailable response
 */
export class EmbeddingServiceUnavailableError extends EmbeddingServiceError {
  constructor(reason?: string) {
    super(
      reason
        ? `Embedding service unavailable: ${reason}`
        : 'Embedding service unavailable, please try again later'
    );
  }
}

/**
 * Thrown when the embedding text exceeds the maximum allowed length
 * This is a domain validation error as it validates business rules about data constraints
 */
export class EmbeddingTextTooLongError extends DomainError {
  constructor(actualLength: number, maxLength: number) {
    super(
      `Embedding text exceeds maximum length: ${actualLength} characters (max: ${maxLength})`
    );
  }
}
