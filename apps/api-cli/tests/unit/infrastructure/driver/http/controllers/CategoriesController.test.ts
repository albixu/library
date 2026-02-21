/**
 * CategoriesController Unit Tests
 *
 * Tests the HTTP controller layer in isolation using mock use cases.
 * Validates response formatting, query parameter handling, and error handling.
 *
 * Part of HU-009: List Categories Endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { CategoriesController } from '../../../../../../src/infrastructure/driver/http/controllers/CategoriesController.js';
import type {
  ListCategoriesUseCase,
  CategoryListItem,
} from '../../../../../../src/application/use-cases/ListCategoriesUseCase.js';

/**
 * Creates a mock ListCategoriesUseCase
 */
function createMockUseCase(): ListCategoriesUseCase {
  return {
    execute: vi.fn(),
  } as unknown as ListCategoriesUseCase;
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
 * Mock output from ListCategoriesUseCase
 */
const mockCategoriesOutput: CategoryListItem[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'architecture',
    typeId: '660e8400-e29b-41d4-a716-446655440001',
    description: 'Books about software architecture',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    name: 'programming',
    typeId: '660e8400-e29b-41d4-a716-446655440001',
    description: null,
  },
];

describe('CategoriesController', () => {
  let controller: CategoriesController;
  let mockUseCase: ListCategoriesUseCase;

  beforeEach(() => {
    mockUseCase = createMockUseCase();
    controller = new CategoriesController({ listCategoriesUseCase: mockUseCase });
  });

  describe('list', () => {
    describe('successful listing without filter', () => {
      it('should return 200 with standardized success response', async () => {
        vi.mocked(mockUseCase.execute).mockResolvedValue(mockCategoriesOutput);
        const request = createMockRequest();
        const reply = createMockReply();

        await controller.list(request, reply);

        expect(reply.status).toHaveBeenCalledWith(200);
        expect(reply.send).toHaveBeenCalledWith({
          success: true,
          data: mockCategoriesOutput,
          error: null,
        });
      });

      it('should have success true in response', async () => {
        vi.mocked(mockUseCase.execute).mockResolvedValue(mockCategoriesOutput);
        const request = createMockRequest();
        const reply = createMockReply();

        await controller.list(request, reply);

        const sentResponse = vi.mocked(reply.send).mock.calls[0][0] as { success: boolean; error: unknown };
        expect(sentResponse.success).toBe(true);
        expect(sentResponse.error).toBeNull();
      });

      it('should call use case execute without type argument', async () => {
        vi.mocked(mockUseCase.execute).mockResolvedValue(mockCategoriesOutput);
        const request = createMockRequest();
        const reply = createMockReply();

        await controller.list(request, reply);

        expect(mockUseCase.execute).toHaveBeenCalledTimes(1);
        expect(mockUseCase.execute).toHaveBeenCalledWith(undefined);
      });

      it('should return categories sorted alphabetically (as returned by use case)', async () => {
        const sortedCategories: CategoryListItem[] = [
          { id: '1', name: 'architecture', typeId: 't1', description: null },
          { id: '2', name: 'programming', typeId: 't1', description: null },
          { id: '3', name: 'testing', typeId: 't1', description: null },
        ];
        vi.mocked(mockUseCase.execute).mockResolvedValue(sortedCategories);
        const request = createMockRequest();
        const reply = createMockReply();

        await controller.list(request, reply);

        const sentResponse = vi.mocked(reply.send).mock.calls[0][0] as { data: CategoryListItem[] };
        expect(sentResponse.data).toEqual(sortedCategories);
        expect(sentResponse.data[0].name).toBe('architecture');
        expect(sentResponse.data[1].name).toBe('programming');
        expect(sentResponse.data[2].name).toBe('testing');
      });

      it('should return empty array when no categories exist', async () => {
        vi.mocked(mockUseCase.execute).mockResolvedValue([]);
        const request = createMockRequest();
        const reply = createMockReply();

        await controller.list(request, reply);

        expect(reply.status).toHaveBeenCalledWith(200);
        const sentResponse = vi.mocked(reply.send).mock.calls[0][0] as {
          success: boolean;
          data: CategoryListItem[];
          error: unknown;
        };
        expect(sentResponse.success).toBe(true);
        expect(sentResponse.data).toEqual([]);
        expect(sentResponse.error).toBeNull();
      });

      it('should return data with id, name, typeId, and description fields', async () => {
        vi.mocked(mockUseCase.execute).mockResolvedValue(mockCategoriesOutput);
        const request = createMockRequest();
        const reply = createMockReply();

        await controller.list(request, reply);

        const sentResponse = vi.mocked(reply.send).mock.calls[0][0] as { data: CategoryListItem[] };
        sentResponse.data.forEach((item: CategoryListItem) => {
          expect(Object.keys(item).sort()).toEqual(['description', 'id', 'name', 'typeId']);
        });
      });
    });

    describe('successful listing with type filter', () => {
      it('should pass type name to use case', async () => {
        vi.mocked(mockUseCase.execute).mockResolvedValue(mockCategoriesOutput);
        const request = createMockRequest({ type: 'technical' });
        const reply = createMockReply();

        await controller.list(request, reply);

        expect(mockUseCase.execute).toHaveBeenCalledWith('technical');
      });

      it('should handle uppercase type name', async () => {
        vi.mocked(mockUseCase.execute).mockResolvedValue(mockCategoriesOutput);
        const request = createMockRequest({ type: 'TECHNICAL' });
        const reply = createMockReply();

        await controller.list(request, reply);

        expect(mockUseCase.execute).toHaveBeenCalledWith('TECHNICAL');
      });

      it('should trim whitespace from type name', async () => {
        vi.mocked(mockUseCase.execute).mockResolvedValue(mockCategoriesOutput);
        const request = createMockRequest({ type: '  technical  ' });
        const reply = createMockReply();

        await controller.list(request, reply);

        expect(mockUseCase.execute).toHaveBeenCalledWith('technical');
      });

      it('should return filtered categories', async () => {
        const filteredCategories: CategoryListItem[] = [
          { id: '1', name: 'architecture', typeId: 't1', description: null },
        ];
        vi.mocked(mockUseCase.execute).mockResolvedValue(filteredCategories);
        const request = createMockRequest({ type: 'technical' });
        const reply = createMockReply();

        await controller.list(request, reply);

        const sentResponse = vi.mocked(reply.send).mock.calls[0][0] as { data: CategoryListItem[] };
        expect(sentResponse.data).toEqual(filteredCategories);
      });

      it('should return empty array when type has no categories', async () => {
        vi.mocked(mockUseCase.execute).mockResolvedValue([]);
        const request = createMockRequest({ type: 'novel' });
        const reply = createMockReply();

        await controller.list(request, reply);

        expect(reply.status).toHaveBeenCalledWith(200);
        const sentResponse = vi.mocked(reply.send).mock.calls[0][0] as { data: CategoryListItem[] };
        expect(sentResponse.data).toEqual([]);
      });

      it('should return empty array when type does not exist', async () => {
        vi.mocked(mockUseCase.execute).mockResolvedValue([]);
        const request = createMockRequest({ type: 'nonexistent' });
        const reply = createMockReply();

        await controller.list(request, reply);

        expect(reply.status).toHaveBeenCalledWith(200);
        const sentResponse = vi.mocked(reply.send).mock.calls[0][0] as { data: CategoryListItem[] };
        expect(sentResponse.data).toEqual([]);
      });

      it('should treat empty string type as no filter', async () => {
        vi.mocked(mockUseCase.execute).mockResolvedValue(mockCategoriesOutput);
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

      const controllerWithLogger = new CategoriesController({
        listCategoriesUseCase: mockUseCase,
        logger: mockLogger,
      });

      expect(controllerWithLogger).toBeInstanceOf(CategoriesController);
    });
  });
});
