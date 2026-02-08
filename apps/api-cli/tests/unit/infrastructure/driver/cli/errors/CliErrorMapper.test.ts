/**
 * CliErrorMapper Tests
 *
 * Unit tests for the CLI error mapper that converts domain/application errors
 * to user-friendly CLI messages and exit codes.
 */

import { describe, it, expect } from 'vitest';
import {
  mapErrorToCliOutput,
  type CliErrorOutput,
} from '../../../../../../src/infrastructure/driver/cli/errors/CliErrorMapper.js';
import {
  DuplicateISBNError,
  DuplicateBookError,
  RequiredFieldError,
  FieldTooLongError,
  TooManyItemsError,
  DuplicateItemError,
} from '../../../../../../src/domain/errors/DomainErrors.js';
import { InvalidISBNError } from '../../../../../../src/domain/value-objects/ISBN.js';
import { InvalidBookTypeError } from '../../../../../../src/domain/value-objects/BookType.js';
import { InvalidBookFormatError } from '../../../../../../src/domain/value-objects/BookFormat.js';
import {
  EmbeddingServiceUnavailableError,
  EmbeddingTextTooLongError,
} from '../../../../../../src/application/errors/ApplicationErrors.js';

describe('CliErrorMapper', () => {
  describe('mapErrorToCliOutput', () => {
    describe('Duplicate errors (exit code 1)', () => {
      it('should map DuplicateISBNError to exit code 1 with descriptive message', () => {
        const error = new DuplicateISBNError('9780132350884');

        const result = mapErrorToCliOutput(error);

        expect(result.exitCode).toBe(1);
        expect(result.message).toContain('ISBN ya registrado');
        expect(result.message).toContain('9780132350884');
      });

      it('should map DuplicateBookError to exit code 1 with descriptive message', () => {
        const error = new DuplicateBookError(
          'Robert C. Martin',
          'Clean Code',
          'pdf'
        );

        const result = mapErrorToCliOutput(error);

        expect(result.exitCode).toBe(1);
        expect(result.message).toContain('libro ya existe');
        expect(result.message).toContain('Robert C. Martin');
        expect(result.message).toContain('Clean Code');
        expect(result.message).toContain('pdf');
      });
    });

    describe('Validation errors (exit code 1)', () => {
      it('should map RequiredFieldError to exit code 1', () => {
        const error = new RequiredFieldError('title');

        const result = mapErrorToCliOutput(error);

        expect(result.exitCode).toBe(1);
        expect(result.message).toContain('title');
        expect(result.message).toContain('obligatorio');
      });

      it('should map FieldTooLongError to exit code 1', () => {
        const error = new FieldTooLongError('description', 5000);

        const result = mapErrorToCliOutput(error);

        expect(result.exitCode).toBe(1);
        expect(result.message).toContain('description');
        expect(result.message).toContain('5000');
      });

      it('should map TooManyItemsError to exit code 1', () => {
        const error = new TooManyItemsError('categories', 10);

        const result = mapErrorToCliOutput(error);

        expect(result.exitCode).toBe(1);
        expect(result.message).toContain('categories');
        expect(result.message).toContain('10');
      });

      it('should map DuplicateItemError to exit code 1', () => {
        const error = new DuplicateItemError('categories', 'programming');

        const result = mapErrorToCliOutput(error);

        expect(result.exitCode).toBe(1);
        expect(result.message).toContain('programming');
        expect(result.message).toContain('duplicado');
      });

      it('should map InvalidISBNError to exit code 1', () => {
        const error = new InvalidISBNError('12345');

        const result = mapErrorToCliOutput(error);

        expect(result.exitCode).toBe(1);
        expect(result.message).toContain('ISBN');
        expect(result.message).toContain('12345');
      });

      it('should map InvalidBookTypeError to exit code 1', () => {
        const error = new InvalidBookTypeError('invalid-type');

        const result = mapErrorToCliOutput(error);

        expect(result.exitCode).toBe(1);
        expect(result.message.toLowerCase()).toContain('tipo');
        expect(result.message).toContain('invalid-type');
      });

      it('should map InvalidBookFormatError to exit code 1', () => {
        const error = new InvalidBookFormatError('invalid-format');

        const result = mapErrorToCliOutput(error);

        expect(result.exitCode).toBe(1);
        expect(result.message.toLowerCase()).toContain('formato');
        expect(result.message).toContain('invalid-format');
      });

      it('should map EmbeddingTextTooLongError to exit code 1', () => {
        const error = new EmbeddingTextTooLongError(8000, 7000);

        const result = mapErrorToCliOutput(error);

        expect(result.exitCode).toBe(1);
        expect(result.message).toContain('texto');
        expect(result.message).toContain('largo');
      });
    });

    describe('Service errors (exit code 1)', () => {
      it('should map EmbeddingServiceUnavailableError to exit code 1 with retry message', () => {
        const error = new EmbeddingServiceUnavailableError('Connection refused');

        const result = mapErrorToCliOutput(error);

        expect(result.exitCode).toBe(1);
        expect(result.message).toContain('embeddings');
        expect(result.message).toContain('disponible');
        expect(result.message).toContain('Intente');
      });
    });

    describe('Unknown errors (exit code 1)', () => {
      it('should map unknown Error to exit code 1 with generic message', () => {
        const error = new Error('Something went wrong');

        const result = mapErrorToCliOutput(error);

        expect(result.exitCode).toBe(1);
        expect(result.message).toContain('inesperado');
      });

      it('should handle non-Error objects', () => {
        const error = 'string error';

        const result = mapErrorToCliOutput(error);

        expect(result.exitCode).toBe(1);
        expect(result.message).toContain('inesperado');
      });
    });

    describe('Output format', () => {
      it('should return CliErrorOutput with correct structure', () => {
        const error = new RequiredFieldError('title');

        const result: CliErrorOutput = mapErrorToCliOutput(error);

        expect(result).toHaveProperty('exitCode');
        expect(result).toHaveProperty('message');
        expect(typeof result.exitCode).toBe('number');
        expect(typeof result.message).toBe('string');
      });

      it('should include error prefix symbol in message', () => {
        const error = new RequiredFieldError('title');

        const result = mapErrorToCliOutput(error);

        expect(result.message).toMatch(/^✗/);
      });
    });
  });
});
