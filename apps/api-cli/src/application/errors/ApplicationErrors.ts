/**
 * Application/Infrastructure Errors
 *
 * Custom error classes for application and infrastructure layer errors.
 * These errors represent technical failures (service unavailability, network errors, etc.)
 * rather than business rule violations.
 *
 * Note: EmbeddingTextTooLongError is defined in domain/errors/DomainErrors.ts as it represents
 * a business rule violation (data constraint), not a technical failure.
 * Re-exported here for backwards compatibility.
 */

/**
 * Base class for embedding service errors (infrastructure/technical failures)
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
  constructor(reason?: string, options?: { cause?: unknown }) {
    super(
      reason
        ? `Embedding service unavailable: ${reason}`
        : 'Embedding service unavailable, please try again later'
    );
    if (options?.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}

// Re-export from domain for backwards compatibility
export { EmbeddingTextTooLongError } from '../../domain/errors/DomainErrors.js';
