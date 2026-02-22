/**
 * Search Books Controller
 *
 * HTTP request handler for the GET /api/books endpoint.
 * Follows the thin controller pattern - delegates business logic to use case.
 *
 * HU-012: Search Books with Filters and Pagination
 */

import type { FastifyReply, FastifyRequest } from 'fastify';
import type { SearchBooksUseCase } from '../../../../application/use-cases/SearchBooksUseCase.js';
import type { Logger } from '../../../../application/ports/Logger.js';
import { noopLogger } from '../../../../application/ports/Logger.js';
import { searchBooksQuerySchema } from '../schemas/search-books.schemas.js';
import { successResponse } from '../schemas/common.schemas.js';
import { mapErrorToHttpResponse } from '../errors/HttpErrorMapper.js';

/**
 * Dependencies required by SearchBooksController
 */
export interface SearchBooksControllerDeps {
  searchBooksUseCase: SearchBooksUseCase;
  logger?: Logger;
}

/**
 * SearchBooksController
 *
 * Handles HTTP requests for book search operations.
 * Responsibilities:
 * - Parse and validate query parameters (Zod)
 * - Call SearchBooksUseCase
 * - Map responses to standardized API format
 * - Handle errors with appropriate status codes
 */
export class SearchBooksController {
  private readonly searchBooksUseCase: SearchBooksUseCase;
  private readonly logger: Logger;

  constructor(deps: SearchBooksControllerDeps) {
    this.searchBooksUseCase = deps.searchBooksUseCase;
    this.logger = deps.logger?.child({ name: 'SearchBooksController' }) ?? noopLogger;
  }

  /**
   * GET /api/books
   *
   * Searches books with filters and pagination.
   *
   * Query parameters:
   * - isbn: Exact ISBN match
   * - title: Partial title match (ILIKE)
   * - author: Partial author name match (ILIKE)
   * - text: Free text for semantic search
   * - types: Type names (OR between values)
   * - categories: Category names (OR between values)
   * - levels: Level names (OR between values)
   * - limit: Results per page (1-100, default 50)
   * - cursor: Pagination cursor
   *
   * Response format: { success: true, data: { items, pagination }, error: null }
   *
   * @returns 200 OK with search results (even if empty)
   * @returns 400 Bad Request for validation errors
   * @returns 503 Service Unavailable if embedding service is down (only with text filter)
   */
  async search(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    this.logger.debug('Received search books request', {
      queryParams: Object.keys(request.query as object).length,
    });

    try {
      // 1. Parse and validate query parameters
      const parseResult = searchBooksQuerySchema.safeParse(request.query);

      if (!parseResult.success) {
        const errorResponse = mapErrorToHttpResponse(parseResult.error);
        this.logger.debug('Request validation failed', {
          errors: parseResult.error.errors.map((e) => e.message),
        });
        return reply.status(errorResponse.statusCode).send(errorResponse.body);
      }

      const query = parseResult.data;

      // 2. Execute use case
      const result = await this.searchBooksUseCase.execute({
        isbn: query.isbn,
        title: query.title,
        author: query.author,
        text: query.text,
        types: query.types,
        categories: query.categories,
        levels: query.levels,
        limit: query.limit,
        cursor: query.cursor,
      });

      // 3. Return search results with standardized response structure
      this.logger.info('Book search completed via API', {
        resultCount: result.items.length,
        totalCount: result.pagination.totalCount,
        hasNextPage: result.pagination.hasNextPage,
      });

      return reply.status(200).send(successResponse(result));
    } catch (error) {
      const errorResponse = mapErrorToHttpResponse(error);

      if (errorResponse.statusCode >= 500) {
        this.logger.error('Unexpected error searching books', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
      } else {
        this.logger.debug('Book search rejected', {
          statusCode: errorResponse.statusCode,
          error: errorResponse.body.error?.message,
        });
      }

      return reply.status(errorResponse.statusCode).send(errorResponse.body);
    }
  }
}
