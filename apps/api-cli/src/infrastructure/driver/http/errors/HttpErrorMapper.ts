/**
 * HTTP Error Mapper
 *
 * Maps domain and application errors to appropriate HTTP status codes
 * and standardized error response format.
 *
 * Part of HU-004: Standardize API Response Structure
 */

import { ZodError } from 'zod';
import {
  DomainError,
  RequiredFieldError,
  FieldTooLongError,
  TooManyItemsError,
  DuplicateItemError,
  DuplicateISBNError,
  DuplicateBookError,
  InvalidBookTypeError,
  EmbeddingTextTooLongError,
} from '../../../../domain/errors/DomainErrors.js';
import { InvalidISBNError } from '../../../../domain/value-objects/ISBN.js';
import { InvalidBookFormatError } from '../../../../domain/value-objects/BookFormat.js';
import { InvalidBookLevelError } from '../../../../domain/value-objects/BookLevel.js';
import {
  EmbeddingServiceUnavailableError,
} from '../../../../application/errors/ApplicationErrors.js';
import {
  errorResponse,
  type ApiErrorResponse,
} from '../schemas/common.schemas.js';

/**
 * HTTP error response structure
 *
 * Contains the HTTP status code and the standardized error response body.
 */
export interface HttpErrorResponse {
  statusCode: number;
  body: ApiErrorResponse;
}

/**
 * Maps a Zod validation error to an HTTP error response
 *
 * @param error - Zod validation error
 * @returns HTTP error response with 400 status and validation details
 */
function mapZodError(error: ZodError): HttpErrorResponse {
  const details = error.errors.map((err) => {
    const path = err.path.join('.');
    return path ? `${path}: ${err.message}` : err.message;
  });

  return {
    statusCode: 400,
    body: errorResponse('Validation failed', details),
  };
}

/**
 * Creates an HTTP error response with the given status and message
 *
 * @param statusCode - HTTP status code
 * @param message - Error message
 * @returns HTTP error response
 */
function createErrorResponse(
  statusCode: number,
  message: string,
): HttpErrorResponse {
  return {
    statusCode,
    body: errorResponse(message),
  };
}

/**
 * Maps domain and application errors to HTTP error responses
 *
 * Uses the standardized API response structure:
 * { success: false, data: null, error: { message, details? } }
 *
 * Status code mapping:
 * - 400 Bad Request: Validation errors (field constraints, ISBN format, type/format invalid)
 * - 409 Conflict: Duplicate errors (ISBN already exists, book already exists)
 * - 503 Service Unavailable: Embedding service down
 * - 500 Internal Server Error: Unknown/unexpected errors
 *
 * @param error - The error to map
 * @returns HTTP error response with appropriate status code and body
 */
export function mapErrorToHttpResponse(error: unknown): HttpErrorResponse {
  // Zod validation errors
  if (error instanceof ZodError) {
    return mapZodError(error);
  }

  // Duplicate errors → 409 Conflict
  if (error instanceof DuplicateISBNError) {
    return createErrorResponse(409, error.message);
  }

  if (error instanceof DuplicateBookError) {
    return createErrorResponse(409, error.message);
  }

  // Embedding service errors
  if (error instanceof EmbeddingServiceUnavailableError) {
    return createErrorResponse(
      503,
      'Embedding service unavailable, please try again later',
    );
  }

  if (error instanceof EmbeddingTextTooLongError) {
    return createErrorResponse(400, error.message);
  }

  // Value object validation errors → 400
  if (error instanceof InvalidISBNError) {
    return createErrorResponse(400, error.message);
  }

  if (error instanceof InvalidBookTypeError) {
    return createErrorResponse(400, error.message);
  }

  if (error instanceof InvalidBookFormatError) {
    return createErrorResponse(400, error.message);
  }

  if (error instanceof InvalidBookLevelError) {
    return createErrorResponse(400, error.message);
  }

  // Domain validation errors → 400
  if (error instanceof RequiredFieldError) {
    return createErrorResponse(400, error.message);
  }

  if (error instanceof FieldTooLongError) {
    return createErrorResponse(400, error.message);
  }

  if (error instanceof TooManyItemsError) {
    return createErrorResponse(400, error.message);
  }

  if (error instanceof DuplicateItemError) {
    return createErrorResponse(400, error.message);
  }

  // Generic domain errors → 400
  if (error instanceof DomainError) {
    return createErrorResponse(400, error.message);
  }

  // Unknown errors → 500
  const message =
    error instanceof Error ? error.message : 'An unexpected error occurred';

  return createErrorResponse(500, message);
}
