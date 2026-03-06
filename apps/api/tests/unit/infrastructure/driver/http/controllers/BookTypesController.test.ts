/**
 * BookTypesController Unit Tests
 *
 * Tests the HTTP controller layer in isolation using mock use cases.
 * Validates response formatting and error handling for book types listing.
 *
 * Part of HU-005: List Book Types Endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { BookTypesController } from '../../../../../../src/infrastructure/driver/http/controllers/BookTypesController.js';
import type {
  ListBookTypesUseCase,
  BookTypeListItem,
} from '../../../../../../src/application/use-cases/ListBookTypesUseCase.js';

/**
 * Creates a mock ListBookTypesUseCase
 */
function createMockUseCase(): ListBookTypesUseCase {
  return {
    execute: vi.fn(),
  } as unknown as ListBookTypesUseCase;
}

/**
 * Creates a mock FastifyRequest
 */
function createMockRequest(): FastifyRequest {
  return {
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
 * Mock output from ListBookTypesUseCase
 */
const mockTypesOutput: BookTypeListItem[] = [
  { id: '550e8400-e29b-41d4-a716-446655440001', name: 'biography' },
  { id: '550e8400-e29b-41d4-a716-446655440002', name: 'novel' },
  { id: '550e8400-e29b-41d4-a716-446655440003', name: 'technical' },
];

describe('BookTypesController', () => {
  let controller: BookTypesController;
  let mockUseCase: ListBookTypesUseCase;

  beforeEach(() => {
    mockUseCase = createMockUseCase();
    controller = new BookTypesController({ listBookTypesUseCase: mockUseCase });
  });

  describe('list', () => {
    describe('successful listing', () => {
      it('should return 200 with standardized success response', async () => {
        vi.mocked(mockUseCase.execute).mockResolvedValue(mockTypesOutput);
        const request = createMockRequest();
        const reply = createMockReply();

        await controller.list(request, reply);

        expect(reply.status).toHaveBeenCalledWith(200);
        expect(reply.send).toHaveBeenCalledWith({
          success: true,
          data: mockTypesOutput,
          error: null,
        });
      });

      it('should have success true in response', async () => {
        vi.mocked(mockUseCase.execute).mockResolvedValue(mockTypesOutput);
        const request = createMockRequest();
        const reply = createMockReply();

        await controller.list(request, reply);

        const sentResponse = vi.mocked(reply.send).mock.calls[0][0];
        expect(sentResponse.success).toBe(true);
        expect(sentResponse.error).toBeNull();
      });

      it('should call use case execute method', async () => {
        vi.mocked(mockUseCase.execute).mockResolvedValue(mockTypesOutput);
        const request = createMockRequest();
        const reply = createMockReply();

        await controller.list(request, reply);

        expect(mockUseCase.execute).toHaveBeenCalledTimes(1);
        expect(mockUseCase.execute).toHaveBeenCalledWith();
      });

      it('should return types sorted alphabetically (as returned by use case)', async () => {
        const sortedTypes: BookTypeListItem[] = [
          { id: '1', name: 'biography' },
          { id: '2', name: 'novel' },
          { id: '3', name: 'technical' },
        ];
        vi.mocked(mockUseCase.execute).mockResolvedValue(sortedTypes);
        const request = createMockRequest();
        const reply = createMockReply();

        await controller.list(request, reply);

        const sentResponse = vi.mocked(reply.send).mock.calls[0][0];
        expect(sentResponse.data).toEqual(sortedTypes);
        expect(sentResponse.data[0].name).toBe('biography');
        expect(sentResponse.data[1].name).toBe('novel');
        expect(sentResponse.data[2].name).toBe('technical');
      });

      it('should return empty array when no types exist', async () => {
        vi.mocked(mockUseCase.execute).mockResolvedValue([]);
        const request = createMockRequest();
        const reply = createMockReply();

        await controller.list(request, reply);

        expect(reply.status).toHaveBeenCalledWith(200);
        const sentResponse = vi.mocked(reply.send).mock.calls[0][0];
        expect(sentResponse.success).toBe(true);
        expect(sentResponse.data).toEqual([]);
        expect(sentResponse.error).toBeNull();
      });

      it('should return data with only id and name fields', async () => {
        vi.mocked(mockUseCase.execute).mockResolvedValue(mockTypesOutput);
        const request = createMockRequest();
        const reply = createMockReply();

        await controller.list(request, reply);

        const sentResponse = vi.mocked(reply.send).mock.calls[0][0];
        sentResponse.data.forEach((item: BookTypeListItem) => {
          expect(Object.keys(item)).toEqual(['id', 'name']);
        });
      });
    });

    describe('unexpected errors (500)', () => {
      it('should return 500 with standardized error response for unexpected errors', async () => {
        vi.mocked(mockUseCase.execute).mockRejectedValue(
          new Error('Database connection failed')
        );
        const request = createMockRequest();
        const reply = createMockReply();

        await controller.list(request, reply);

        expect(reply.status).toHaveBeenCalledWith(500);
        const sentResponse = vi.mocked(reply.send).mock.calls[0][0];
        expect(sentResponse.success).toBe(false);
        expect(sentResponse.data).toBeNull();
        expect(sentResponse.error.message).toBe('Database connection failed');
      });

      it('should have success false and data null on error', async () => {
        vi.mocked(mockUseCase.execute).mockRejectedValue(
          new Error('Connection timeout')
        );
        const request = createMockRequest();
        const reply = createMockReply();

        await controller.list(request, reply);

        const sentResponse = vi.mocked(reply.send).mock.calls[0][0];
        expect(sentResponse.success).toBe(false);
        expect(sentResponse.data).toBeNull();
        expect(sentResponse.error).not.toBeNull();
      });

      it('should handle non-Error objects thrown', async () => {
        vi.mocked(mockUseCase.execute).mockRejectedValue('String error');
        const request = createMockRequest();
        const reply = createMockReply();

        await controller.list(request, reply);

        expect(reply.status).toHaveBeenCalledWith(500);
        const sentResponse = vi.mocked(reply.send).mock.calls[0][0];
        expect(sentResponse.success).toBe(false);
      });
    });
  });

  describe('constructor', () => {
    it('should accept optional logger', () => {
      const mockLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        child: vi.fn().mockReturnThis(),
      };

      const controllerWithLogger = new BookTypesController({
        listBookTypesUseCase: mockUseCase,
        logger: mockLogger,
      });

      expect(controllerWithLogger).toBeInstanceOf(BookTypesController);
    });
  });
});
