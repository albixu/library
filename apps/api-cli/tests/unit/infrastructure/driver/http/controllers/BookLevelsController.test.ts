/**
 * BookLevelsController Unit Tests
 *
 * Tests the HTTP controller layer in isolation using mock use cases.
 * Validates response formatting, query parameter handling, and error handling.
 *
 * Part of HU-010: List Book Levels Endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { BookLevelsController } from '../../../../../../src/infrastructure/driver/http/controllers/BookLevelsController.js';
import type {
  ListBookLevelsUseCase,
  BookLevelListItem,
} from '../../../../../../src/application/use-cases/ListBookLevelsUseCase.js';

/**
 * Creates a mock ListBookLevelsUseCase
 */
function createMockUseCase(): ListBookLevelsUseCase {
  return {
    execute: vi.fn(),
  } as unknown as ListBookLevelsUseCase;
}

/**
 * Creates a mock FastifyRequest with optional query
 */
function createMockRequest(query: Record<string, unknown> = {}): FastifyRequest {
  return {
    headers: { 'content-type': 'application/json' },
    query,
  } as unknown as FastifyRequest;
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
 * Mock output from ListBookLevelsUseCase
 */
const mockLevelsOutput: BookLevelListItem[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'advanced',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    name: 'beginner',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    name: 'intermediate',
  },
];

describe('BookLevelsController', () => {
  let controller: BookLevelsController;
  let mockUseCase: ListBookLevelsUseCase;

  beforeEach(() => {
    mockUseCase = createMockUseCase();
    controller = new BookLevelsController({ listBookLevelsUseCase: mockUseCase });
  });

  describe('list', () => {
    describe('successful listing without filter', () => {
      it('should return 200 with standardized success response', async () => {
        vi.mocked(mockUseCase.execute).mockResolvedValue(mockLevelsOutput);
        const request = createMockRequest();
        const reply = createMockReply();

        await controller.list(request, reply);

        expect(reply.status).toHaveBeenCalledWith(200);
        expect(reply.send).toHaveBeenCalledWith({
          success: true,
          data: mockLevelsOutput,
          error: null,
        });
      });

      it('should have success true in response', async () => {
        vi.mocked(mockUseCase.execute).mockResolvedValue(mockLevelsOutput);
        const request = createMockRequest();
        const reply = createMockReply();

        await controller.list(request, reply);

        const sentResponse = vi.mocked(reply.send).mock.calls[0][0] as { success: boolean; error: unknown };
        expect(sentResponse.success).toBe(true);
        expect(sentResponse.error).toBeNull();
      });

      it('should call use case execute without type argument', async () => {
        vi.mocked(mockUseCase.execute).mockResolvedValue(mockLevelsOutput);
        const request = createMockRequest();
        const reply = createMockReply();

        await controller.list(request, reply);

        expect(mockUseCase.execute).toHaveBeenCalledTimes(1);
        expect(mockUseCase.execute).toHaveBeenCalledWith(undefined);
      });

      it('should return levels sorted alphabetically (as returned by use case)', async () => {
        const sortedLevels: BookLevelListItem[] = [
          { id: '1', name: 'advanced' },
          { id: '2', name: 'beginner' },
          { id: '3', name: 'intermediate' },
        ];
        vi.mocked(mockUseCase.execute).mockResolvedValue(sortedLevels);
        const request = createMockRequest();
        const reply = createMockReply();

        await controller.list(request, reply);

        const sentResponse = vi.mocked(reply.send).mock.calls[0][0] as { data: BookLevelListItem[] };
        expect(sentResponse.data).toEqual(sortedLevels);
        expect(sentResponse.data[0].name).toBe('advanced');
        expect(sentResponse.data[1].name).toBe('beginner');
        expect(sentResponse.data[2].name).toBe('intermediate');
      });

      it('should return empty array when no levels exist', async () => {
        vi.mocked(mockUseCase.execute).mockResolvedValue([]);
        const request = createMockRequest();
        const reply = createMockReply();

        await controller.list(request, reply);

        expect(reply.status).toHaveBeenCalledWith(200);
        const sentResponse = vi.mocked(reply.send).mock.calls[0][0] as {
          success: boolean;
          data: BookLevelListItem[];
          error: unknown;
        };
        expect(sentResponse.success).toBe(true);
        expect(sentResponse.data).toEqual([]);
        expect(sentResponse.error).toBeNull();
      });

      it('should return data with only id and name fields', async () => {
        vi.mocked(mockUseCase.execute).mockResolvedValue(mockLevelsOutput);
        const request = createMockRequest();
        const reply = createMockReply();

        await controller.list(request, reply);

        const sentResponse = vi.mocked(reply.send).mock.calls[0][0] as { data: BookLevelListItem[] };
        sentResponse.data.forEach((item: BookLevelListItem) => {
          expect(Object.keys(item).sort()).toEqual(['id', 'name']);
        });
      });
    });

    describe('successful listing with type filter', () => {
      it('should pass type name to use case', async () => {
        vi.mocked(mockUseCase.execute).mockResolvedValue(mockLevelsOutput);
        const request = createMockRequest({ type: 'technical' });
        const reply = createMockReply();

        await controller.list(request, reply);

        expect(mockUseCase.execute).toHaveBeenCalledWith('technical');
      });

      it('should handle uppercase type name', async () => {
        vi.mocked(mockUseCase.execute).mockResolvedValue(mockLevelsOutput);
        const request = createMockRequest({ type: 'TECHNICAL' });
        const reply = createMockReply();

        await controller.list(request, reply);

        expect(mockUseCase.execute).toHaveBeenCalledWith('TECHNICAL');
      });

      it('should trim whitespace from type name', async () => {
        vi.mocked(mockUseCase.execute).mockResolvedValue(mockLevelsOutput);
        const request = createMockRequest({ type: '  technical  ' });
        const reply = createMockReply();

        await controller.list(request, reply);

        expect(mockUseCase.execute).toHaveBeenCalledWith('technical');
      });

      it('should return filtered levels', async () => {
        const filteredLevels: BookLevelListItem[] = [
          { id: '1', name: 'advanced' },
          { id: '2', name: 'intermediate' },
        ];
        vi.mocked(mockUseCase.execute).mockResolvedValue(filteredLevels);
        const request = createMockRequest({ type: 'technical' });
        const reply = createMockReply();

        await controller.list(request, reply);

        const sentResponse = vi.mocked(reply.send).mock.calls[0][0] as { data: BookLevelListItem[] };
        expect(sentResponse.data).toEqual(filteredLevels);
      });

      it('should return empty array when type has no levels', async () => {
        vi.mocked(mockUseCase.execute).mockResolvedValue([]);
        const request = createMockRequest({ type: 'novel' });
        const reply = createMockReply();

        await controller.list(request, reply);

        expect(reply.status).toHaveBeenCalledWith(200);
        const sentResponse = vi.mocked(reply.send).mock.calls[0][0] as { data: BookLevelListItem[] };
        expect(sentResponse.data).toEqual([]);
      });

      it('should return empty array when type does not exist', async () => {
        vi.mocked(mockUseCase.execute).mockResolvedValue([]);
        const request = createMockRequest({ type: 'nonexistent' });
        const reply = createMockReply();

        await controller.list(request, reply);

        expect(reply.status).toHaveBeenCalledWith(200);
        const sentResponse = vi.mocked(reply.send).mock.calls[0][0] as { data: BookLevelListItem[] };
        expect(sentResponse.data).toEqual([]);
      });

      it('should treat empty string type as no filter', async () => {
        vi.mocked(mockUseCase.execute).mockResolvedValue(mockLevelsOutput);
        const request = createMockRequest({ type: '' });
        const reply = createMockReply();

        await controller.list(request, reply);

        expect(mockUseCase.execute).toHaveBeenCalledWith(undefined);
      });
    });

    describe('unexpected errors (500)', () => {
      it('should return 500 with standardized error response for unexpected errors', async () => {
        vi.mocked(mockUseCase.execute).mockRejectedValue(
          new Error('Database connection failed'),
        );
        const request = createMockRequest();
        const reply = createMockReply();

        await controller.list(request, reply);

        expect(reply.status).toHaveBeenCalledWith(500);
        const sentResponse = vi.mocked(reply.send).mock.calls[0][0] as {
          success: boolean;
          data: null;
          error: { message: string };
        };
        expect(sentResponse.success).toBe(false);
        expect(sentResponse.data).toBeNull();
        expect(sentResponse.error.message).toBe('Database connection failed');
      });

      it('should have success false and data null on error', async () => {
        vi.mocked(mockUseCase.execute).mockRejectedValue(
          new Error('Connection timeout'),
        );
        const request = createMockRequest();
        const reply = createMockReply();

        await controller.list(request, reply);

        const sentResponse = vi.mocked(reply.send).mock.calls[0][0] as {
          success: boolean;
          data: null;
          error: unknown;
        };
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
        const sentResponse = vi.mocked(reply.send).mock.calls[0][0] as { success: boolean };
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

      const controllerWithLogger = new BookLevelsController({
        listBookLevelsUseCase: mockUseCase,
        logger: mockLogger,
      });

      expect(controllerWithLogger).toBeInstanceOf(BookLevelsController);
    });
  });
});
