/**
 * BookTypes Controller
 *
 * HTTP request handlers for book type-related endpoints.
 * Follows the thin controller pattern - delegates business logic to use cases.
 *
 * Part of HU-005: List Book Types Endpoint
 */

import type { FastifyReply, FastifyRequest } from 'fastify';
import type { ListBookTypesUseCase } from '../../../../application/use-cases/ListBookTypesUseCase.js';
import type { Logger } from '../../../../application/ports/Logger.js';
import { noopLogger } from '../../../../application/ports/Logger.js';
import { successResponse } from '../schemas/common.schemas.js';
import { mapErrorToHttpResponse } from '../errors/HttpErrorMapper.js';

/**
 * Dependencies required by BookTypesController
 */
export interface BookTypesControllerDeps {
  listBookTypesUseCase: ListBookTypesUseCase;
  logger?: Logger;
}

/**
 * BookTypesController
 *
 * Handles HTTP requests for book type operations.
 * Responsibilities:
 * - Call appropriate use case
 * - Map responses to standardized API format
 * - Handle errors with appropriate status codes
 */
export class BookTypesController {
  private readonly listBookTypesUseCase: ListBookTypesUseCase;
  private readonly logger: Logger;

  constructor(deps: BookTypesControllerDeps) {
    this.listBookTypesUseCase = deps.listBookTypesUseCase;
    this.logger = deps.logger?.child({ name: 'BookTypesController' }) ?? noopLogger;
  }

  /**
   * GET /api/book-types
   *
   * Retrieves all book types sorted alphabetically.
   * Used to populate frontend dropdowns and selects.
   *
   * Response format: { success: true, data: BookTypeListItem[], error: null }
   *
   * @returns 200 OK with array of book types (id, name)
   * @returns 500 Internal Server Error for unexpected errors
   */
  async list(
    _request: FastifyRequest,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    this.logger.debug('Received list book types request');

    try {
      const types = await this.listBookTypesUseCase.execute();

      this.logger.debug('Book types retrieved', { count: types.length });

      return reply.status(200).send(successResponse(types));
    } catch (error) {
      const errorResponse = mapErrorToHttpResponse(error);

      if (errorResponse.statusCode >= 500) {
        this.logger.error('Unexpected error listing book types', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
      } else {
        this.logger.debug('Book types request rejected', {
          statusCode: errorResponse.statusCode,
          error: errorResponse.body.error?.message,
        });
      }

      return reply.status(errorResponse.statusCode).send(errorResponse.body);
    }
  }
}
