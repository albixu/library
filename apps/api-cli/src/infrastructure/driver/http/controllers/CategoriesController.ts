/**
 * Categories Controller
 *
 * HTTP request handlers for category-related endpoints.
 * Follows the thin controller pattern - delegates business logic to use cases.
 *
 * Part of HU-009: List Categories Endpoint
 */

import type { FastifyReply, FastifyRequest } from 'fastify';
import type { ListCategoriesUseCase } from '../../../../application/use-cases/ListCategoriesUseCase.js';
import type { Logger } from '../../../../application/ports/Logger.js';
import { noopLogger } from '../../../../application/ports/Logger.js';
import { successResponse } from '../schemas/common.schemas.js';
import { mapErrorToHttpResponse } from '../errors/HttpErrorMapper.js';
import { listCategoriesQuerySchema } from '../schemas/category.schemas.js';

/**
 * Dependencies required by CategoriesController
 */
export interface CategoriesControllerDeps {
  listCategoriesUseCase: ListCategoriesUseCase;
  logger?: Logger;
}

/**
 * CategoriesController
 *
 * Handles HTTP requests for category operations.
 * Responsibilities:
 * - Validate and extract query parameters
 * - Call appropriate use case
 * - Map responses to standardized API format
 * - Handle errors with appropriate status codes
 */
export class CategoriesController {
  private readonly listCategoriesUseCase: ListCategoriesUseCase;
  private readonly logger: Logger;

  constructor(deps: CategoriesControllerDeps) {
    this.listCategoriesUseCase = deps.listCategoriesUseCase;
    this.logger = deps.logger?.child({ name: 'CategoriesController' }) ?? noopLogger;
  }

  /**
   * GET /api/categories
   *
   * Retrieves all categories, optionally filtered by type name.
   * Categories are sorted alphabetically by name (A-Z).
   *
   * Query parameters:
   * - type: Optional type name to filter categories (case-insensitive)
   *
   * Response format: { success: true, data: CategoryListItem[], error: null }
   *
   * @returns 200 OK with array of categories (id, name, typeId, description)
   * @returns 500 Internal Server Error for unexpected errors
   */
  async list(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    this.logger.debug('Received list categories request', {
      query: request.query,
    });

    try {
      // Parse and validate query parameters
      const query = listCategoriesQuerySchema.parse(request.query);
      const typeName = query.type;

      this.logger.debug('Query parameters validated', { typeName });

      const categories = await this.listCategoriesUseCase.execute(typeName);

      this.logger.debug('Categories retrieved', {
        count: categories.length,
        typeName,
      });

      return reply.status(200).send(successResponse(categories));
    } catch (error) {
      const errorResponse = mapErrorToHttpResponse(error);

      if (errorResponse.statusCode >= 500) {
        this.logger.error('Unexpected error listing categories', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
      } else {
        this.logger.debug('Categories request rejected', {
          statusCode: errorResponse.statusCode,
          error: errorResponse.body.error?.message,
        });
      }

      return reply.status(errorResponse.statusCode).send(errorResponse.body);
    }
  }
}
