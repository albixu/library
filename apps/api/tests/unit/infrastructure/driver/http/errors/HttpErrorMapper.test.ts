/**
 * HttpErrorMapper Unit Tests
 *
 * Tests for mapping domain/application errors to HTTP responses
 * with the standardized API response structure.
 */

import { describe, it, expect } from 'vitest';
import { ZodError, ZodIssue } from 'zod';
import { mapErrorToHttpResponse } from '../../../../../../src/infrastructure/driver/http/errors/HttpErrorMapper.js';
import {
  RequiredFieldError,
  FieldTooLongError,
  TooManyItemsError,
  DuplicateItemError,
  DuplicateISBNError,
  DuplicateBookError,
  InvalidBookTypeError,
  DomainError,
  CategoryTypeMismatchError,
  LevelTypeMismatchError,
  InvalidLanguageCodeError,
} from '../../../../../../src/domain/errors/DomainErrors.js';
import { InvalidBookIdentifierError } from '../../../../../../src/domain/value-objects/BookIdentifier.js';
import { InvalidBookFormatError } from '../../../../../../src/domain/value-objects/BookFormat.js';
import {
  EmbeddingServiceUnavailableError,
  EmbeddingTextTooLongError,
  TranslationServiceUnavailableError,
  TranslationError,
} from '../../../../../../src/application/errors/ApplicationErrors.js';

describe('HttpErrorMapper', () => {
  describe('mapErrorToHttpResponse', () => {
    describe('Response structure', () => {
      it('should return standardized error response structure', () => {
        const error = new RequiredFieldError('title');
        const response = mapErrorToHttpResponse(error);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('data', null);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toHaveProperty('message');
      });
    });

    describe('Zod validation errors', () => {
      it('should map ZodError to 400 with details', () => {
        const issues: ZodIssue[] = [
          {
            code: 'invalid_type',
            expected: 'string',
            received: 'undefined',
            path: ['title'],
            message: 'Required',
          },
          {
            code: 'invalid_type',
            expected: 'array',
            received: 'undefined',
            path: ['authors'],
            message: 'Required',
          },
        ];
        const zodError = new ZodError(issues);

        const response = mapErrorToHttpResponse(zodError);

        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.data).toBeNull();
        expect(response.body.error.message).toBe('Validation failed');
        expect(response.body.error.details).toEqual([
          'title: Required',
          'authors: Required',
        ]);
      });

      it('should handle ZodError with empty path', () => {
        const issues: ZodIssue[] = [
          {
            code: 'custom',
            path: [],
            message: 'Custom validation error',
          },
        ];
        const zodError = new ZodError(issues);

        const response = mapErrorToHttpResponse(zodError);

        expect(response.body.error.details).toEqual(['Custom validation error']);
      });
    });

    describe('Duplicate errors (409)', () => {
      it('should map DuplicateISBNError to 409', () => {
        const error = new DuplicateISBNError('9780132350884');

        const response = mapErrorToHttpResponse(error);

        expect(response.statusCode).toBe(409);
        expect(response.body.success).toBe(false);
        expect(response.body.data).toBeNull();
        expect(response.body.error.message).toContain('9780132350884');
      });

      it('should map DuplicateBookError to 409', () => {
        const error = new DuplicateBookError('Robert C. Martin', 'Clean Code', 'pdf');

        const response = mapErrorToHttpResponse(error);

        expect(response.statusCode).toBe(409);
        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toContain('Clean Code');
      });
    });

    describe('Embedding service errors', () => {
      it('should map EmbeddingServiceUnavailableError to 503', () => {
        const error = new EmbeddingServiceUnavailableError();

        const response = mapErrorToHttpResponse(error);

        expect(response.statusCode).toBe(503);
        expect(response.body.success).toBe(false);
        expect(response.body.data).toBeNull();
        expect(response.body.error.message).toBe(
          'Embedding service unavailable, please try again later'
        );
      });

      it('should map EmbeddingTextTooLongError to 400', () => {
        const error = new EmbeddingTextTooLongError(8000, 7000);

        const response = mapErrorToHttpResponse(error);

        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toContain('8000');
      });
    });

    describe('Translation service errors', () => {
      it('should map TranslationServiceUnavailableError to 503', () => {
        const error = new TranslationServiceUnavailableError();

        const response = mapErrorToHttpResponse(error);

        expect(response.statusCode).toBe(503);
        expect(response.body.success).toBe(false);
        expect(response.body.data).toBeNull();
        expect(response.body.error.message).toBe(
          'Translation service unavailable, please try again later',
        );
      });

      it('should map TranslationError to 400', () => {
        const error = new TranslationError('Invalid translation response format');

        const response = mapErrorToHttpResponse(error);

        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.data).toBeNull();
        expect(response.body.error.message).toBe('Invalid translation response format');
      });

      it('should map InvalidLanguageCodeError to 400', () => {
        const error = new InvalidLanguageCodeError('xx');

        const response = mapErrorToHttpResponse(error);

        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.data).toBeNull();
        expect(response.body.error.message).toContain('xx');
      });
    });

    describe('Value object validation errors (400)', () => {
      it('should map InvalidBookIdentifierError to 400', () => {
        const error = new InvalidBookIdentifierError('invalid identifier!');

        const response = mapErrorToHttpResponse(error);

        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toContain('invalid identifier!');
      });

      it('should map InvalidBookTypeError to 400', () => {
        const error = new InvalidBookTypeError('invalid-type');

        const response = mapErrorToHttpResponse(error);

        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toContain('invalid-type');
      });

      it('should map InvalidBookFormatError to 400', () => {
        const error = new InvalidBookFormatError('invalid-format');

        const response = mapErrorToHttpResponse(error);

        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toContain('invalid-format');
      });

    });

    describe('Type mismatch errors (422)', () => {
      it('should map CategoryTypeMismatchError to 422', () => {
        const error = new CategoryTypeMismatchError(
          'Fiction',
          'Non-Fiction Book',
          'Technical Book'
        );

        const response = mapErrorToHttpResponse(error);

        expect(response.statusCode).toBe(422);
        expect(response.body.success).toBe(false);
        expect(response.body.data).toBeNull();
        expect(response.body.error.message).toContain('Fiction');
        expect(response.body.error.message).toContain('Technical Book');
      });

      it('should map LevelTypeMismatchError to 422', () => {
        const error = new LevelTypeMismatchError('Beginner', 'Non-Fiction Book');

        const response = mapErrorToHttpResponse(error);

        expect(response.statusCode).toBe(422);
        expect(response.body.success).toBe(false);
        expect(response.body.data).toBeNull();
        expect(response.body.error.message).toContain('Beginner');
        expect(response.body.error.message).toContain('Non-Fiction Book');
      });
    });

    describe('Domain validation errors (400)', () => {
      it('should map RequiredFieldError to 400', () => {
        const error = new RequiredFieldError('title');

        const response = mapErrorToHttpResponse(error);

        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toContain('title');
      });

      it('should map FieldTooLongError to 400', () => {
        const error = new FieldTooLongError('description', 10000);

        const response = mapErrorToHttpResponse(error);

        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toContain('description');
        expect(response.body.error.message).toContain('10000');
      });

      it('should map TooManyItemsError to 400', () => {
        const error = new TooManyItemsError('categories', 10);

        const response = mapErrorToHttpResponse(error);

        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toContain('categories');
      });

      it('should map DuplicateItemError to 400', () => {
        const error = new DuplicateItemError('authors');

        const response = mapErrorToHttpResponse(error);

        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toContain('authors');
      });

      it('should map generic DomainError to 400', () => {
        const error = new DomainError('Generic domain error');

        const response = mapErrorToHttpResponse(error);

        expect(response.statusCode).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toBe('Generic domain error');
      });
    });

    describe('Unknown errors (500)', () => {
      it('should map unknown Error to 500', () => {
        const error = new Error('Something went wrong');

        const response = mapErrorToHttpResponse(error);

        expect(response.statusCode).toBe(500);
        expect(response.body.success).toBe(false);
        expect(response.body.data).toBeNull();
        expect(response.body.error.message).toBe('Something went wrong');
      });

      it('should handle non-Error objects', () => {
        const error = 'string error';

        const response = mapErrorToHttpResponse(error);

        expect(response.statusCode).toBe(500);
        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toBe('An unexpected error occurred');
      });

      it('should handle null/undefined errors', () => {
        const response = mapErrorToHttpResponse(null);

        expect(response.statusCode).toBe(500);
        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toBe('An unexpected error occurred');
      });
    });

    describe('Error response without details', () => {
      it('should not include details property for simple errors', () => {
        const error = new RequiredFieldError('title');

        const response = mapErrorToHttpResponse(error);

        expect(response.body.error).not.toHaveProperty('details');
      });
    });
  });
});
