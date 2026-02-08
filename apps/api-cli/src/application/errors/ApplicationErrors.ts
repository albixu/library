/**
 * Application/Infrastructure Errors
 *
 * Custom error classes for application and infrastructure layer errors.
 * These errors represent technical failures (service unavailability, network errors, etc.)
 * rather than business rule violations.
 *
 * Unlike domain errors, these extend the base Error class directly since they
 * are not part of the business domain model.
 */

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
 * This is an application/infrastructure validation error as it validates
 * technical constraints of the embedding service
 */
export class EmbeddingTextTooLongError extends EmbeddingServiceError {
  constructor(actualLength: number, maxLength: number) {
    super(
      `Embedding text exceeds maximum length: ${actualLength} characters (max: ${maxLength})`
    );
  }
}
