/**
 * SearchBooksController Unit Tests
 *
 * Tests the HTTP controller for book search in isolation using mock use cases.
 * Validates request validation, response formatting, and error handling.
 *
 * HU-012: Search Books with Filters and Pagination
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { SearchBooksController } from '../../../../../../src/infrastructure/driver/http/controllers/SearchBooksController.js';
import type {
  SearchBooksUseCase,
  SearchBooksOutput,
} from '../../../../../../src/application/use-cases/SearchBooksUseCase.js';
import { EmbeddingServiceUnavailableError } from '../../../../../../src/application/errors/ApplicationErrors.js';

/**
 * Creates a mock SearchBooksUseCase
 */
function createMockUseCase(): SearchBooksUseCase {
  return {
    execute: vi.fn(),
  } as unknown as SearchBooksUseCase;
}

/**
 * Creates a mock FastifyRequest with given query
 */
function createMockRequest(query: unknown): FastifyRequest {
  return {
    query,
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
 * Mock output from SearchBooksUseCase
 */
const mockSearchOutput: SearchBooksOutput = {
  items: [
    {
      id: '550e8400-e29b-41d4-a716-446655440000',
      isbn: '9780132350884',
      title: 'Clean Code',
      authors: [{ id: '550e8400-e29b-41d4-a716-446655440020', name: 'Robert C. Martin' }],
      type: 'technical',
      categories: [{ id: '660e8400-e29b-41d4-a716-446655440001', name: 'programming' }],
      level: 'Intermediate',
      format: 'pdf',
      description: 'A Handbook of Agile Software Craftsmanship',
      similarityScore: null,
      favorite: false,
    },
  ],
  pagination: {
    limit: 50,
    hasNextPage: false,
    nextCursor: null,
    totalCount: 1,
  },
};

describe('SearchBooksController', () => {
  let controller: SearchBooksController;
  let mockUseCase: SearchBooksUseCase;

  beforeEach(() => {
    mockUseCase = createMockUseCase();
    controller = new SearchBooksController({ searchBooksUseCase: mockUseCase });
  });

  describe('search', () => {
    describe('successful search', () => {
      it('should return 200 with standardized success response', async () => {
        vi.mocked(mockUseCase.execute).mockResolvedValue(mockSearchOutput);
        const request = createMockRequest({});
        const reply = createMockReply();

        await controller.search(request, reply);

        expect(reply.status).toHaveBeenCalledWith(200);
        expect(reply.send).toHaveBeenCalledWith({
          success: true,
          data: mockSearchOutput,
          error: null,
        });
      });

      it('should have success true in response', async () => {
        vi.mocked(mockUseCase.execute).mockResolvedValue(mockSearchOutput);
        const request = createMockRequest({});
        const reply = createMockReply();

        await controller.search(request, reply);

        const sentResponse = vi.mocked(reply.send).mock.calls[0][0];
        expect(sentResponse.success).toBe(true);
        expect(sentResponse.error).toBeNull();
      });

      it('should call use case with default values for empty query', async () => {
        vi.mocked(mockUseCase.execute).mockResolvedValue(mockSearchOutput);
        const request = createMockRequest({});
        const reply = createMockReply();

        await controller.search(request, reply);

        expect(mockUseCase.execute).toHaveBeenCalledWith({
          isbn: undefined,
          title: undefined,
          author: undefined,
          text: undefined,
          types: undefined,
          categories: undefined,
          levels: undefined,
          limit: 50,
          cursor: undefined,
        });
      });

      it('should pass all filters to use case', async () => {
        vi.mocked(mockUseCase.execute).mockResolvedValue(mockSearchOutput);
        const request = createMockRequest({
          isbn: '9780132350884',
          title: 'Clean',
          author: 'Martin',
          text: 'software craftsmanship',
          types: ['technical'],
          categories: ['programming'],
          levels: ['intermediate'],
          limit: '20',
          cursor: 'abc123',
        });
        const reply = createMockReply();

        await controller.search(request, reply);

        expect(mockUseCase.execute).toHaveBeenCalledWith({
          isbn: '9780132350884',
          title: 'Clean',
          author: 'Martin',
          text: 'software craftsmanship',
          types: ['technical'],
          categories: ['programming'],
          levels: ['intermediate'],
          limit: 20,
          cursor: 'abc123',
        });
      });

      it('should normalize types from string to array', async () => {
        vi.mocked(mockUseCase.execute).mockResolvedValue(mockSearchOutput);
        const request = createMockRequest({ types: 'technical' });
        const reply = createMockReply();

        await controller.search(request, reply);

        expect(mockUseCase.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            types: ['technical'],
          })
        );
      });

      it('should normalize categories from string to array', async () => {
        vi.mocked(mockUseCase.execute).mockResolvedValue(mockSearchOutput);
        const request = createMockRequest({ categories: 'programming' });
        const reply = createMockReply();

        await controller.search(request, reply);

        expect(mockUseCase.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            categories: ['programming'],
          })
        );
      });

      it('should normalize levels from string to array', async () => {
        vi.mocked(mockUseCase.execute).mockResolvedValue(mockSearchOutput);
        const request = createMockRequest({ levels: 'intermediate' });
        const reply = createMockReply();

        await controller.search(request, reply);

        expect(mockUseCase.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            levels: ['intermediate'],
          })
        );
      });

      it('should return empty items when no results found', async () => {
        const emptyOutput: SearchBooksOutput = {
          items: [],
          pagination: {
            limit: 50,
            hasNextPage: false,
            nextCursor: null,
            totalCount: 0,
          },
        };
        vi.mocked(mockUseCase.execute).mockResolvedValue(emptyOutput);
        const request = createMockRequest({});
        const reply = createMockReply();

        await controller.search(request, reply);

        expect(reply.status).toHaveBeenCalledWith(200);
        const sentResponse = vi.mocked(reply.send).mock.calls[0][0];
        expect(sentResponse.success).toBe(true);
        expect(sentResponse.data.items).toEqual([]);
        expect(sentResponse.data.pagination.totalCount).toBe(0);
      });

      it('should include similarityScore when using text search', async () => {
        const outputWithScore: SearchBooksOutput = {
          items: [
            {
              ...mockSearchOutput.items[0],
              similarityScore: 0.87,
            },
          ],
          pagination: mockSearchOutput.pagination,
        };
        vi.mocked(mockUseCase.execute).mockResolvedValue(outputWithScore);
        const request = createMockRequest({ text: 'clean architecture' });
        const reply = createMockReply();

        await controller.search(request, reply);

        const sentResponse = vi.mocked(reply.send).mock.calls[0][0];
        expect(sentResponse.data.items[0].similarityScore).toBe(0.87);
      });

      it('should include pagination metadata in response', async () => {
        const outputWithPagination: SearchBooksOutput = {
          items: mockSearchOutput.items,
          pagination: {
            limit: 10,
            hasNextPage: true,
            nextCursor: 'eyJsYXN0SWQiOiIxMjM0In0=',
            totalCount: 100,
          },
        };
        vi.mocked(mockUseCase.execute).mockResolvedValue(outputWithPagination);
        const request = createMockRequest({ limit: '10' });
        const reply = createMockReply();

        await controller.search(request, reply);

        const sentResponse = vi.mocked(reply.send).mock.calls[0][0];
        expect(sentResponse.data.pagination).toEqual({
          limit: 10,
          hasNextPage: true,
          nextCursor: 'eyJsYXN0SWQiOiIxMjM0In0=',
          totalCount: 100,
        });
      });
    });

    describe('validation errors (400)', () => {
      it('should return 400 when limit is less than 1', async () => {
        const request = createMockRequest({ limit: '0' });
        const reply = createMockReply();

        await controller.search(request, reply);

        expect(reply.status).toHaveBeenCalledWith(400);
        const sentResponse = vi.mocked(reply.send).mock.calls[0][0];
        expect(sentResponse.success).toBe(false);
        expect(sentResponse.data).toBeNull();
        expect(sentResponse.error.message).toBe('Validation failed');
      });

      it('should return 400 when limit is greater than 100', async () => {
        const request = createMockRequest({ limit: '101' });
        const reply = createMockReply();

        await controller.search(request, reply);

        expect(reply.status).toHaveBeenCalledWith(400);
        const sentResponse = vi.mocked(reply.send).mock.calls[0][0];
        expect(sentResponse.success).toBe(false);
      });

      it('should return 400 when title is empty', async () => {
        const request = createMockRequest({ title: '' });
        const reply = createMockReply();

        await controller.search(request, reply);

        expect(reply.status).toHaveBeenCalledWith(400);
        const sentResponse = vi.mocked(reply.send).mock.calls[0][0];
        expect(sentResponse.success).toBe(false);
      });

      it('should return 400 when types is empty array', async () => {
        const request = createMockRequest({ types: [] });
        const reply = createMockReply();

        await controller.search(request, reply);

        expect(reply.status).toHaveBeenCalledWith(400);
        const sentResponse = vi.mocked(reply.send).mock.calls[0][0];
        expect(sentResponse.success).toBe(false);
      });

      it('should return 400 when cursor is empty string', async () => {
        const request = createMockRequest({ cursor: '' });
        const reply = createMockReply();

        await controller.search(request, reply);

        expect(reply.status).toHaveBeenCalledWith(400);
        const sentResponse = vi.mocked(reply.send).mock.calls[0][0];
        expect(sentResponse.success).toBe(false);
      });
    });

    describe('service unavailable errors (503)', () => {
      it('should return 503 when embedding service is unavailable', async () => {
        vi.mocked(mockUseCase.execute).mockRejectedValue(
          new EmbeddingServiceUnavailableError('Connection refused')
        );
        const request = createMockRequest({ text: 'clean architecture' });
        const reply = createMockReply();

        await controller.search(request, reply);

        expect(reply.status).toHaveBeenCalledWith(503);
        const sentResponse = vi.mocked(reply.send).mock.calls[0][0];
        expect(sentResponse.success).toBe(false);
        expect(sentResponse.data).toBeNull();
        expect(sentResponse.error.message).toContain('unavailable');
      });
    });

    describe('unexpected errors (500)', () => {
      it('should return 500 for unexpected errors', async () => {
        vi.mocked(mockUseCase.execute).mockRejectedValue(
          new Error('Database connection failed')
        );
        const request = createMockRequest({});
        const reply = createMockReply();

        await controller.search(request, reply);

        expect(reply.status).toHaveBeenCalledWith(500);
        const sentResponse = vi.mocked(reply.send).mock.calls[0][0];
        expect(sentResponse.success).toBe(false);
        expect(sentResponse.data).toBeNull();
        expect(sentResponse.error.message).toBe('Database connection failed');
      });
    });
  });
});
