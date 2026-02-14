/**
 * BooksController Unit Tests
 *
 * Tests the HTTP controller layer in isolation using mock use cases.
 * Validates request validation, response formatting, and error handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { BooksController } from '../../../../../../src/infrastructure/driver/http/controllers/BooksController.js';
import type { CreateBookUseCase, CreateBookOutput } from '../../../../../../src/application/use-cases/CreateBookUseCase.js';
import {
  DuplicateISBNError,
  DuplicateBookError,
  RequiredFieldError,
  InvalidBookTypeError,
} from '../../../../../../src/domain/errors/DomainErrors.js';
import { InvalidISBNError } from '../../../../../../src/domain/value-objects/ISBN.js';
import { InvalidBookFormatError } from '../../../../../../src/domain/value-objects/BookFormat.js';
import {
  EmbeddingServiceUnavailableError,
  EmbeddingTextTooLongError,
} from '../../../../../../src/application/errors/ApplicationErrors.js';

/**
 * Creates a mock CreateBookUseCase
 */
function createMockUseCase(): CreateBookUseCase {
  return {
    execute: vi.fn(),
  } as unknown as CreateBookUseCase;
}

/**
 * Creates a mock FastifyRequest with given body
 */
function createMockRequest(body: unknown): FastifyRequest {
  return {
    body,
    headers: { 'content-type': 'application/json' },
  } as FastifyRequest;
}

/**
 * Creates a mock FastifyReply with chainable methods
 */
function createMockReply(): FastifyReply {
  const reply = {
    status: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  } as unknown as FastifyReply;
  return reply;
}

/**
 * Valid book creation request body
 */
const validRequestBody = {
  title: 'Clean Code',
  authors: ['Robert C. Martin'],
  description: 'A Handbook of Agile Software Craftsmanship',
  type: 'technical',
  format: 'pdf',
  categories: ['programming', 'software engineering'],
  isbn: '9780132350884',
  available: true,
  path: '/books/clean-code.pdf',
};

/**
 * Mock output from CreateBookUseCase
 */
const mockBookOutput: CreateBookOutput = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  title: 'Clean Code',
  authors: [
    { id: '550e8400-e29b-41d4-a716-446655440020', name: 'Robert C. Martin' },
  ],
  description: 'A Handbook of Agile Software Craftsmanship',
  type: 'technical',
  format: 'pdf',
  categories: [
    { id: '123e4567-e89b-12d3-a456-426614174000', name: 'programming' },
    { id: '123e4567-e89b-12d3-a456-426614174001', name: 'software engineering' },
  ],
  isbn: '9780132350884',
  available: true,
  path: '/books/clean-code.pdf',
  createdAt: new Date('2026-02-08T12:00:00Z'),
  updatedAt: new Date('2026-02-08T12:00:00Z'),
};

describe('BooksController', () => {
  let controller: BooksController;
  let mockUseCase: CreateBookUseCase;

  beforeEach(() => {
    mockUseCase = createMockUseCase();
    controller = new BooksController({ createBookUseCase: mockUseCase });
  });

  describe('create', () => {
    describe('successful creation', () => {
      it('should return 201 with created book data', async () => {
        vi.mocked(mockUseCase.execute).mockResolvedValue(mockBookOutput);
        const request = createMockRequest(validRequestBody);
        const reply = createMockReply();

        await controller.create(request, reply);

        expect(reply.status).toHaveBeenCalledWith(201);
        expect(reply.send).toHaveBeenCalledWith({
          id: mockBookOutput.id,
          title: mockBookOutput.title,
          authors: mockBookOutput.authors,
          description: mockBookOutput.description,
          type: mockBookOutput.type,
          format: mockBookOutput.format,
          categories: mockBookOutput.categories,
          isbn: mockBookOutput.isbn,
          available: mockBookOutput.available,
          path: mockBookOutput.path,
          createdAt: '2026-02-08T12:00:00.000Z',
          updatedAt: '2026-02-08T12:00:00.000Z',
        });
      });

      it('should call use case with correct input', async () => {
        vi.mocked(mockUseCase.execute).mockResolvedValue(mockBookOutput);
        const request = createMockRequest(validRequestBody);
        const reply = createMockReply();

        await controller.create(request, reply);

        expect(mockUseCase.execute).toHaveBeenCalledWith({
          title: 'Clean Code',
          author: 'Robert C. Martin', // Controller extracts first author from array
          description: 'A Handbook of Agile Software Craftsmanship',
          type: 'technical',
          format: 'pdf',
          categoryNames: ['programming', 'software engineering'],
          isbn: '9780132350884',
          available: true,
          path: '/books/clean-code.pdf',
        });
      });

      it('should handle optional fields being null', async () => {
        const bodyWithoutOptional = {
          ...validRequestBody,
          isbn: null,
          path: null,
        };
        const outputWithoutOptional: CreateBookOutput = {
          ...mockBookOutput,
          isbn: null,
          path: null,
        };

        vi.mocked(mockUseCase.execute).mockResolvedValue(outputWithoutOptional);
        const request = createMockRequest(bodyWithoutOptional);
        const reply = createMockReply();

        await controller.create(request, reply);

        expect(reply.status).toHaveBeenCalledWith(201);
      });

      it('should trim whitespace from string fields', async () => {
        const bodyWithWhitespace = {
          ...validRequestBody,
          title: '  Clean Code  ',
          authors: ['  Robert C. Martin  '],
        };

        vi.mocked(mockUseCase.execute).mockResolvedValue(mockBookOutput);
        const request = createMockRequest(bodyWithWhitespace);
        const reply = createMockReply();

        await controller.create(request, reply);

        expect(mockUseCase.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Clean Code',
            author: 'Robert C. Martin',
          })
        );
      });

      it('should default available to true if not provided', async () => {
        const bodyWithoutAvailable = { ...validRequestBody };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (bodyWithoutAvailable as any).available;

        vi.mocked(mockUseCase.execute).mockResolvedValue(mockBookOutput);
        const request = createMockRequest(bodyWithoutAvailable);
        const reply = createMockReply();

        await controller.create(request, reply);

        expect(mockUseCase.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            available: true,
          })
        );
      });
    });

    describe('validation errors (400)', () => {
      it('should return 400 when title is missing', async () => {
        const body = { ...validRequestBody };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (body as any).title;
        const request = createMockRequest(body);
        const reply = createMockReply();

        await controller.create(request, reply);

        expect(reply.status).toHaveBeenCalledWith(400);
        expect(reply.send).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Validation failed',
            details: expect.arrayContaining([expect.stringContaining('title')]),
          })
        );
      });

      it('should return 400 when title is empty', async () => {
        const body = { ...validRequestBody, title: '' };
        const request = createMockRequest(body);
        const reply = createMockReply();

        await controller.create(request, reply);

        expect(reply.status).toHaveBeenCalledWith(400);
      });

      it('should return 400 when title exceeds max length', async () => {
        const body = { ...validRequestBody, title: 'x'.repeat(501) };
        const request = createMockRequest(body);
        const reply = createMockReply();

        await controller.create(request, reply);

        expect(reply.status).toHaveBeenCalledWith(400);
        expect(reply.send).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Validation failed',
            details: expect.arrayContaining([
              expect.stringContaining('500'),
            ]),
          })
        );
      });

      it('should return 400 when authors is missing', async () => {
        const body = { ...validRequestBody };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (body as any).authors;
        const request = createMockRequest(body);
        const reply = createMockReply();

        await controller.create(request, reply);

        expect(reply.status).toHaveBeenCalledWith(400);
      });

      it('should return 400 when authors array is empty', async () => {
        const body = { ...validRequestBody, authors: [] };
        const request = createMockRequest(body);
        const reply = createMockReply();

        await controller.create(request, reply);

        expect(reply.status).toHaveBeenCalledWith(400);
      });

      it('should return 400 when authors exceeds 10', async () => {
        const body = {
          ...validRequestBody,
          authors: Array(11).fill('Author Name'),
        };
        const request = createMockRequest(body);
        const reply = createMockReply();

        await controller.create(request, reply);

        expect(reply.status).toHaveBeenCalledWith(400);
      });

      it('should return 400 when description is missing', async () => {
        const body = { ...validRequestBody };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (body as any).description;
        const request = createMockRequest(body);
        const reply = createMockReply();

        await controller.create(request, reply);

        expect(reply.status).toHaveBeenCalledWith(400);
      });

      // Note: Type validation removed in TASK-005.
      // Type validation will be done against database in TASK-010 (TypeRepository).

      it('should return 400 when format is invalid', async () => {
        const body = { ...validRequestBody, format: 'invalid-format' };
        const request = createMockRequest(body);
        const reply = createMockReply();

        await controller.create(request, reply);

        expect(reply.status).toHaveBeenCalledWith(400);
      });

      it('should return 400 when categories is empty', async () => {
        const body = { ...validRequestBody, categories: [] };
        const request = createMockRequest(body);
        const reply = createMockReply();

        await controller.create(request, reply);

        expect(reply.status).toHaveBeenCalledWith(400);
      });

      it('should return 400 when categories exceeds 10', async () => {
        const body = {
          ...validRequestBody,
          categories: Array(11).fill('category'),
        };
        const request = createMockRequest(body);
        const reply = createMockReply();

        await controller.create(request, reply);

        expect(reply.status).toHaveBeenCalledWith(400);
      });

      it('should return 400 for invalid ISBN from domain', async () => {
        vi.mocked(mockUseCase.execute).mockRejectedValue(
          new InvalidISBNError('invalid-isbn')
        );
        const request = createMockRequest(validRequestBody);
        const reply = createMockReply();

        await controller.create(request, reply);

        expect(reply.status).toHaveBeenCalledWith(400);
        expect(reply.send).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.stringContaining('Invalid ISBN'),
          })
        );
      });

      it('should return 400 for invalid book type from domain', async () => {
        vi.mocked(mockUseCase.execute).mockRejectedValue(
          new InvalidBookTypeError('invalid')
        );
        const request = createMockRequest(validRequestBody);
        const reply = createMockReply();

        await controller.create(request, reply);

        expect(reply.status).toHaveBeenCalledWith(400);
      });

      it('should return 400 for invalid book format from domain', async () => {
        vi.mocked(mockUseCase.execute).mockRejectedValue(
          new InvalidBookFormatError('invalid')
        );
        const request = createMockRequest(validRequestBody);
        const reply = createMockReply();

        await controller.create(request, reply);

        expect(reply.status).toHaveBeenCalledWith(400);
      });

      it('should return 400 for required field error from domain', async () => {
        vi.mocked(mockUseCase.execute).mockRejectedValue(
          new RequiredFieldError('title')
        );
        const request = createMockRequest(validRequestBody);
        const reply = createMockReply();

        await controller.create(request, reply);

        expect(reply.status).toHaveBeenCalledWith(400);
      });

      it('should return 400 for embedding text too long', async () => {
        vi.mocked(mockUseCase.execute).mockRejectedValue(
          new EmbeddingTextTooLongError(8000, 7000)
        );
        const request = createMockRequest(validRequestBody);
        const reply = createMockReply();

        await controller.create(request, reply);

        expect(reply.status).toHaveBeenCalledWith(400);
      });
    });

    describe('duplicate errors (409)', () => {
      it('should return 409 for duplicate ISBN', async () => {
        vi.mocked(mockUseCase.execute).mockRejectedValue(
          new DuplicateISBNError('9780132350884')
        );
        const request = createMockRequest(validRequestBody);
        const reply = createMockReply();

        await controller.create(request, reply);

        expect(reply.status).toHaveBeenCalledWith(409);
        expect(reply.send).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.stringContaining('ISBN'),
          })
        );
      });

      it('should return 409 for duplicate book (triad)', async () => {
        vi.mocked(mockUseCase.execute).mockRejectedValue(
          new DuplicateBookError('Robert C. Martin', 'Clean Code', 'pdf')
        );
        const request = createMockRequest(validRequestBody);
        const reply = createMockReply();

        await controller.create(request, reply);

        expect(reply.status).toHaveBeenCalledWith(409);
        expect(reply.send).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.stringContaining('already exists'),
          })
        );
      });
    });

    describe('service unavailable errors (503)', () => {
      it('should return 503 when embedding service is unavailable', async () => {
        vi.mocked(mockUseCase.execute).mockRejectedValue(
          new EmbeddingServiceUnavailableError('Connection refused')
        );
        const request = createMockRequest(validRequestBody);
        const reply = createMockReply();

        await controller.create(request, reply);

        expect(reply.status).toHaveBeenCalledWith(503);
        expect(reply.send).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.stringContaining('unavailable'),
          })
        );
      });
    });

    describe('unexpected errors (500)', () => {
      it('should return 500 for unexpected errors', async () => {
        vi.mocked(mockUseCase.execute).mockRejectedValue(
          new Error('Database connection failed')
        );
        const request = createMockRequest(validRequestBody);
        const reply = createMockReply();

        await controller.create(request, reply);

        expect(reply.status).toHaveBeenCalledWith(500);
        expect(reply.send).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Database connection failed',
          })
        );
      });
    });
  });
});
