/**
 * HTTP Error Mapper
 *
 * Maps domain and application errors to appropriate HTTP status codes
 * and error response formats.
 */

import { ZodError } from 'zod';
import { DomainError } from '../../../../domain/errors/DomainErrors.js';
import {
  RequiredFieldError,
  FieldTooLongError,
  TooManyItemsError,
  DuplicateItemError,
  DuplicateISBNError,
  DuplicateBookError,
} from '../../../../domain/errors/DomainErrors.js';
import { InvalidISBNError } from '../../../../domain/value-objects/ISBN.js';
import { InvalidBookTypeError } from '../../../../domain/value-objects/BookType.js';
import { InvalidBookFormatError } from '../../../../domain/value-objects/BookFormat.js';
import {
  EmbeddingServiceUnavailableError,
  EmbeddingTextTooLongError,
} from '../../../../application/errors/ApplicationErrors.js';
import type { ErrorResponse } from '../schemas/book.schemas.js';

/**
 * HTTP error response structure
 */
export interface HttpErrorResponse {
  statusCode: number;
  body: ErrorResponse;
}

/**
 * Maps a Zod validation error to an HTTP error response
 */
function mapZodError(error: ZodError): HttpErrorResponse {
  const details = error.errors.map((err) => {
    const path = err.path.join('.');
    return path ? `${path}: ${err.message}` : err.message;
  });

  return {
    statusCode: 400,
    body: {
      error: 'Validation failed',
      details,
    },
  };
}

/**
 * Maps domain and application errors to HTTP error responses
 *
 * Status code mapping:
 * - 400 Bad Request: Validation errors (field constraints, ISBN format, type/format invalid)
 * - 409 Conflict: Duplicate errors (ISBN already exists, book already exists)
 * - 503 Service Unavailable: Embedding service down
 */
export function mapErrorToHttpResponse(error: unknown): HttpErrorResponse {
  // Zod validation errors
  if (error instanceof ZodError) {
    return mapZodError(error);
  }

  // Duplicate errors → 409 Conflict
  if (error instanceof DuplicateISBNError) {
    return {
      statusCode: 409,
      body: { error: error.message },
    };
  }

  if (error instanceof DuplicateBookError) {
    return {
      statusCode: 409,
      body: { error: error.message },
    };
  }

  // Embedding service errors
  if (error instanceof EmbeddingServiceUnavailableError) {
    return {
      statusCode: 503,
      body: { error: 'Embedding service unavailable, please try again later' },
    };
  }

  if (error instanceof EmbeddingTextTooLongError) {
    return {
      statusCode: 400,
      body: { error: error.message },
    };
  }

  // Value object validation errors → 400
  if (error instanceof InvalidISBNError) {
    return {
      statusCode: 400,
      body: { error: error.message },
    };
  }

  if (error instanceof InvalidBookTypeError) {
    return {
      statusCode: 400,
      body: { error: error.message },
    };
  }

  if (error instanceof InvalidBookFormatError) {
    return {
      statusCode: 400,
      body: { error: error.message },
    };
  }

  // Domain validation errors → 400
  if (error instanceof RequiredFieldError) {
    return {
      statusCode: 400,
      body: { error: error.message },
    };
  }

  if (error instanceof FieldTooLongError) {
    return {
      statusCode: 400,
      body: { error: error.message },
    };
  }

  if (error instanceof TooManyItemsError) {
    return {
      statusCode: 400,
      body: { error: error.message },
    };
  }

  if (error instanceof DuplicateItemError) {
    return {
      statusCode: 400,
      body: { error: error.message },
    };
  }

  // Generic domain errors → 400
  if (error instanceof DomainError) {
    return {
      statusCode: 400,
      body: { error: error.message },
    };
  }

  // Unknown errors → 500
  const message =
    error instanceof Error ? error.message : 'An unexpected error occurred';

  return {
    statusCode: 500,
    body: { error: message },
  };
}
