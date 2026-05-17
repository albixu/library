/**
 * SendBookByEmailController Unit Tests
 *
 * Tests the HTTP controller for the POST /api/books/:id/send endpoint in isolation.
 * Validates request parsing, response formatting, and error handling.
 *
 * HU-036: Send book by email feature.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { SendBookByEmailController } from '../../../../../../src/infrastructure/driver/http/controllers/SendBookByEmailController.js';
import type { SendBookByEmailUseCase } from '../../../../../../src/application/use-cases/SendBookByEmailUseCase.js';
import { InvalidEmailAddressError } from '../../../../../../src/domain/value-objects/EmailAddress.js';
import {
  BookNotFoundError,
  BookFileNotFoundError,
  EmailSendError,
} from '../../../../../../src/domain/errors/DomainErrors.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockUseCase(): SendBookByEmailUseCase {
  return {
    execute: vi.fn(),
  } as unknown as SendBookByEmailUseCase;
}

function createMockRequest(
  params: { id: string },
  body: unknown,
): FastifyRequest<{ Params: { id: string } }> {
  return {
    params,
    body,
  } as FastifyRequest<{ Params: { id: string } }>;
}

function createMockReply(): FastifyReply {
  return {
    status: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  } as unknown as FastifyReply;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SendBookByEmailController', () => {
  let controller: SendBookByEmailController;
  let mockUseCase: SendBookByEmailUseCase;

  beforeEach(() => {
    mockUseCase = createMockUseCase();
    controller = new SendBookByEmailController({ sendBookByEmailUseCase: mockUseCase });
  });

  describe('send', () => {
    describe('successful request (200)', () => {
      it('should return 200 with sent: true when email is sent successfully', async () => {
        vi.mocked(mockUseCase.execute).mockResolvedValue(undefined);
        const request = createMockRequest({ id: 'book-uuid-123' }, { email: 'user@example.com' });
        const reply = createMockReply();

        await controller.send(request, reply);

        expect(reply.status).toHaveBeenCalledWith(200);
        expect(reply.send).toHaveBeenCalledWith({
          success: true,
          data: { sent: true },
          error: null,
        });
      });

      it('should call the use case with the correct bookId and email', async () => {
        vi.mocked(mockUseCase.execute).mockResolvedValue(undefined);
        const request = createMockRequest({ id: 'book-uuid-456' }, { email: 'reader@library.com' });
        const reply = createMockReply();

        await controller.send(request, reply);

        expect(mockUseCase.execute).toHaveBeenCalledWith({
          bookId: 'book-uuid-456',
          email: 'reader@library.com',
        });
      });
    });

    describe('validation errors (400)', () => {
      it('should return 400 when email field is missing from body', async () => {
        const request = createMockRequest({ id: 'book-uuid-123' }, {});
        const reply = createMockReply();

        await controller.send(request, reply);

        expect(reply.status).toHaveBeenCalledWith(400);
        const sentResponse = vi.mocked(reply.send).mock.calls[0][0] as {
          success: boolean;
          error: { message: string };
        };
        expect(sentResponse.success).toBe(false);
        expect(sentResponse.error.message).toBe('Validation failed');
        expect(mockUseCase.execute).not.toHaveBeenCalled();
      });

      it('should return 400 when email has invalid format', async () => {
        const request = createMockRequest({ id: 'book-uuid-123' }, { email: 'not-an-email' });
        const reply = createMockReply();

        await controller.send(request, reply);

        expect(reply.status).toHaveBeenCalledWith(400);
        const sentResponse = vi.mocked(reply.send).mock.calls[0][0] as {
          success: boolean;
        };
        expect(sentResponse.success).toBe(false);
        expect(mockUseCase.execute).not.toHaveBeenCalled();
      });

      it('should return 400 when use case throws InvalidEmailAddressError', async () => {
        vi.mocked(mockUseCase.execute).mockRejectedValue(
          new InvalidEmailAddressError('bad-email'),
        );
        // Bypass Zod validation with a technically valid-looking email that fails VO
        const request = createMockRequest({ id: 'book-uuid-123' }, { email: 'bad@email.com' });
        const reply = createMockReply();

        await controller.send(request, reply);

        expect(reply.status).toHaveBeenCalledWith(400);
        const sentResponse = vi.mocked(reply.send).mock.calls[0][0] as {
          success: boolean;
          error: { message: string };
        };
        expect(sentResponse.success).toBe(false);
        expect(sentResponse.error.message).toContain('bad-email');
      });

      it('should return 400 when email field is null', async () => {
        const request = createMockRequest({ id: 'book-uuid-123' }, { email: null });
        const reply = createMockReply();

        await controller.send(request, reply);

        expect(reply.status).toHaveBeenCalledWith(400);
      });
    });

    describe('not found errors (404)', () => {
      it('should return 404 when use case throws BookNotFoundError', async () => {
        vi.mocked(mockUseCase.execute).mockRejectedValue(
          new BookNotFoundError('missing-book-id'),
        );
        const request = createMockRequest({ id: 'missing-book-id' }, { email: 'user@example.com' });
        const reply = createMockReply();

        await controller.send(request, reply);

        expect(reply.status).toHaveBeenCalledWith(404);
        const sentResponse = vi.mocked(reply.send).mock.calls[0][0] as {
          success: boolean;
          error: { message: string };
        };
        expect(sentResponse.success).toBe(false);
        expect(sentResponse.error.message).toContain('missing-book-id');
      });
    });

    describe('unprocessable entity errors (422)', () => {
      it('should return 422 when use case throws BookFileNotFoundError', async () => {
        vi.mocked(mockUseCase.execute).mockRejectedValue(
          new BookFileNotFoundError('book-uuid-123'),
        );
        const request = createMockRequest({ id: 'book-uuid-123' }, { email: 'user@example.com' });
        const reply = createMockReply();

        await controller.send(request, reply);

        expect(reply.status).toHaveBeenCalledWith(422);
        const sentResponse = vi.mocked(reply.send).mock.calls[0][0] as {
          success: boolean;
          error: { message: string };
        };
        expect(sentResponse.success).toBe(false);
        expect(sentResponse.error.message).toContain('book-uuid-123');
      });
    });

    describe('email send errors (500)', () => {
      it('should return 500 when use case throws EmailSendError', async () => {
        vi.mocked(mockUseCase.execute).mockRejectedValue(
          new EmailSendError('user@example.com', 'SMTP timeout'),
        );
        const request = createMockRequest({ id: 'book-uuid-123' }, { email: 'user@example.com' });
        const reply = createMockReply();

        await controller.send(request, reply);

        expect(reply.status).toHaveBeenCalledWith(500);
        const sentResponse = vi.mocked(reply.send).mock.calls[0][0] as {
          success: boolean;
          error: { message: string };
        };
        expect(sentResponse.success).toBe(false);
        expect(sentResponse.error.message).toContain('user@example.com');
      });

      it('should return 500 for unexpected errors', async () => {
        vi.mocked(mockUseCase.execute).mockRejectedValue(new Error('Unexpected DB failure'));
        const request = createMockRequest({ id: 'book-uuid-123' }, { email: 'user@example.com' });
        const reply = createMockReply();

        await controller.send(request, reply);

        expect(reply.status).toHaveBeenCalledWith(500);
        const sentResponse = vi.mocked(reply.send).mock.calls[0][0] as {
          success: boolean;
          error: { message: string };
        };
        expect(sentResponse.success).toBe(false);
        expect(sentResponse.error.message).toBe('Unexpected DB failure');
      });

      it('should return 500 for non-Error thrown values', async () => {
        vi.mocked(mockUseCase.execute).mockRejectedValue('string error');
        const request = createMockRequest({ id: 'book-uuid-123' }, { email: 'user@example.com' });
        const reply = createMockReply();

        await controller.send(request, reply);

        expect(reply.status).toHaveBeenCalledWith(500);
        const sentResponse = vi.mocked(reply.send).mock.calls[0][0] as {
          success: boolean;
        };
        expect(sentResponse.success).toBe(false);
      });
    });
  });
});
