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
  CategoryTypeMismatchError,
  LevelTypeMismatchError,
  BookNotFoundError,
  BookFileNotFoundError,
  EmailSendError,
} from '../../../../domain/errors/DomainErrors.js';
import { InvalidEmailAddressError } from '../../../../domain/value-objects/EmailAddress.js';
import { InvalidBookIdentifierError } from '../../../../domain/value-objects/BookIdentifier.js';
import { InvalidBookFormatError } from '../../../../domain/value-objects/BookFormat.js';
import {
  EmbeddingServiceUnavailableError,
  TranslationServiceUnavailableError,
  TranslationError,
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
 * - 400 Bad Request: Validation errors (field constraints, ISBN format, type/format invalid, translation failure)
 * - 409 Conflict: Duplicate errors (ISBN already exists, book already exists)
 * - 422 Unprocessable Entity: Business rule violations (type-category-level mismatches)
 * - 503 Service Unavailable: Embedding or translation service down
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

  // HU-036: Invalid email address → 400
  if (error instanceof InvalidEmailAddressError) {
    return createErrorResponse(400, error.message);
  }

  // HU-036: Book not found → 404
  if (error instanceof BookNotFoundError) {
    return createErrorResponse(404, error.message);
  }

  // HU-036: Book file not found → 422
  if (error instanceof BookFileNotFoundError) {
    return createErrorResponse(422, error.message);
  }

  // HU-036: Email send error → 500
  if (error instanceof EmailSendError) {
    return createErrorResponse(500, error.message);
  }

  // Duplicate errors → 409 Conflict
  if (error instanceof DuplicateISBNError) {
    return createErrorResponse(409, error.message);
  }

  if (error instanceof DuplicateBookError) {
    return createErrorResponse(409, error.message);
  }

  // HU-008: Type-category-level mismatch errors → 422 Unprocessable Entity
  // These are business rule violations where the data is valid but semantically incorrect
  if (error instanceof CategoryTypeMismatchError) {
    return createErrorResponse(422, error.message);
  }

  if (error instanceof LevelTypeMismatchError) {
    return createErrorResponse(422, error.message);
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

  // Translation service errors
  if (error instanceof TranslationServiceUnavailableError) {
    return createErrorResponse(
      503,
      'Translation service unavailable, please try again later',
    );
  }

  if (error instanceof TranslationError) {
    return createErrorResponse(400, error.message);
  }

  // Value object validation errors → 400
  if (error instanceof InvalidBookIdentifierError) {
    return createErrorResponse(400, error.message);
  }

  if (error instanceof InvalidBookTypeError) {
    return createErrorResponse(400, error.message);
  }

  if (error instanceof InvalidBookFormatError) {
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
