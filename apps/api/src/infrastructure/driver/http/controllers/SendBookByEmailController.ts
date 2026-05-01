/**
 * SendBookByEmailController
 *
 * HTTP request handler for the POST /api/books/:id/send endpoint.
 * Follows the thin controller pattern - delegates business logic to the use case.
 *
 * HU-036: Send book by email feature.
 */

import type { FastifyReply, FastifyRequest } from 'fastify';
import type { SendBookByEmailUseCase } from '../../../../application/use-cases/SendBookByEmailUseCase.js';
import type { Logger } from '../../../../application/ports/Logger.js';
import { noopLogger } from '../../../../application/ports/Logger.js';
import { sendBookByEmailSchema } from '../schemas/send-book.schemas.js';
import { successResponse } from '../schemas/common.schemas.js';
import { mapErrorToHttpResponse } from '../errors/HttpErrorMapper.js';

/**
 * Dependencies required by SendBookByEmailController
 */
export interface SendBookByEmailControllerDeps {
  sendBookByEmailUseCase: SendBookByEmailUseCase;
  logger?: Logger;
}

/**
 * SendBookByEmailController
 *
 * Handles HTTP requests for sending a book by email.
 */
export class SendBookByEmailController {
  private readonly sendBookByEmailUseCase: SendBookByEmailUseCase;
  private readonly logger: Logger;

  constructor(deps: SendBookByEmailControllerDeps) {
    this.sendBookByEmailUseCase = deps.sendBookByEmailUseCase;
    this.logger = deps.logger?.child({ name: 'SendBookByEmailController' }) ?? noopLogger;
  }

  /**
   * POST /api/books/:id/send
   *
   * Sends a book file to the given email address.
   *
   * @returns 200 OK on success
   * @returns 400 Bad Request for invalid email address
   * @returns 404 Not Found if the book does not exist
   * @returns 422 Unprocessable Entity if the book has no file or the file does not exist
   * @returns 500 Internal Server Error if the email could not be sent
   */
  async send(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    const bookId = request.params.id;

    this.logger.debug('Received send book by email request', { bookId });

    try {
      // 1. Parse and validate request body
      const parseResult = sendBookByEmailSchema.safeParse(request.body);

      if (!parseResult.success) {
        const errorResponse = mapErrorToHttpResponse(parseResult.error);
        this.logger.debug('Request validation failed', {
          errors: parseResult.error.errors.map((e) => e.message),
        });
        return reply.status(errorResponse.statusCode).send(errorResponse.body);
      }

      const { email } = parseResult.data;

      // 2. Execute use case
      await this.sendBookByEmailUseCase.execute({ bookId, email });

      // 3. Return success
      this.logger.info('Book sent by email', { bookId, email });

      return reply.status(200).send(successResponse({ sent: true }));
    } catch (error) {
      const errorResponse = mapErrorToHttpResponse(error);

      if (errorResponse.statusCode >= 500) {
        this.logger.error('Unexpected error sending book by email', {
          bookId,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
      } else {
        this.logger.debug('Send book by email rejected', {
          bookId,
          statusCode: errorResponse.statusCode,
          error: errorResponse.body.error?.message,
        });
      }

      return reply.status(errorResponse.statusCode).send(errorResponse.body);
    }
  }
}
