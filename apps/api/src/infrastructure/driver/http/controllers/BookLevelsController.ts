/**
 * Book Levels Controller
 *
 * HTTP request handlers for book level-related endpoints.
 * Follows the thin controller pattern - delegates business logic to use cases.
 *
 * Part of HU-010: List Book Levels Endpoint
 */

import type { FastifyReply, FastifyRequest } from 'fastify';
import type { ListBookLevelsUseCase } from '../../../../application/use-cases/ListBookLevelsUseCase.js';
import type { Logger } from '../../../../application/ports/Logger.js';
import { noopLogger } from '../../../../application/ports/Logger.js';
import { successResponse } from '../schemas/common.schemas.js';
import { mapErrorToHttpResponse } from '../errors/HttpErrorMapper.js';
import { listBookLevelsQuerySchema } from '../schemas/book-level.schemas.js';

/**
 * Dependencies required by BookLevelsController
 */
export interface BookLevelsControllerDeps {
  listBookLevelsUseCase: ListBookLevelsUseCase;
  logger?: Logger;
}

/**
 * BookLevelsController
 *
 * Handles HTTP requests for book level operations.
 * Responsibilities:
 * - Validate and extract query parameters
 * - Call appropriate use case
 * - Map responses to standardized API format
 * - Handle errors with appropriate status codes
 */
export class BookLevelsController {
  private readonly listBookLevelsUseCase: ListBookLevelsUseCase;
  private readonly logger: Logger;

  constructor(deps: BookLevelsControllerDeps) {
    this.listBookLevelsUseCase = deps.listBookLevelsUseCase;
    this.logger = deps.logger?.child({ name: 'BookLevelsController' }) ?? noopLogger;
  }

  /**
   * GET /api/book-levels
   *
   * Retrieves all book levels, optionally filtered by type name.
   * Levels are sorted alphabetically by name (A-Z).
   *
   * Query parameters:
   * - type: Optional type name to filter levels (case-insensitive)
   *
   * Response format: { success: true, data: BookLevelListItem[], error: null }
   *
   * @returns 200 OK with array of levels (id, name)
   * @returns 500 Internal Server Error for unexpected errors
   */
  async list(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    this.logger.debug('Received list book levels request', {
      query: request.query,
    });

    try {
      // Parse and validate query parameters
      const query = listBookLevelsQuerySchema.parse(request.query);
      const typeName = query.type;

      this.logger.debug('Query parameters validated', { typeName });

      const levels = await this.listBookLevelsUseCase.execute(typeName);

      this.logger.debug('Book levels retrieved', {
        count: levels.length,
        typeName,
      });

      return reply.status(200).send(successResponse(levels));
    } catch (error) {
      const errorResponse = mapErrorToHttpResponse(error);

      if (errorResponse.statusCode >= 500) {
        this.logger.error('Unexpected error listing book levels', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
      } else {
        this.logger.debug('Book levels request rejected', {
          statusCode: errorResponse.statusCode,
          error: errorResponse.body.error?.message,
        });
      }

      return reply.status(errorResponse.statusCode).send(errorResponse.body);
    }
  }
}
