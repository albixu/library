/**
 * RecommendationsController
 *
 * HTTP request handler for the GET /api/books/recommendations endpoint.
 * Follows the thin controller pattern — delegates business logic to use cases.
 *
 * HU-040: Book recommendations HTTP controller.
 */

import type { FastifyReply, FastifyRequest } from 'fastify';
import type { GetRecommendationsUseCase } from '../../../../application/use-cases/GetRecommendationsUseCase.js';
import type { JwtService } from '../../../../domain/user/ports/JwtService.js';
import type { Logger } from '../../../../application/ports/Logger.js';
import { noopLogger } from '../../../../application/ports/Logger.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { successResponse } from '../schemas/common.schemas.js';
import { mapErrorToHttpResponse } from '../errors/HttpErrorMapper.js';

/**
 * Dependencies required by RecommendationsController
 */
export interface RecommendationsControllerDeps {
  getRecommendationsUseCase: GetRecommendationsUseCase;
  jwtService: JwtService;
  logger?: Logger;
}

/**
 * RecommendationsController
 *
 * Handles HTTP requests for book recommendations.
 */
export class RecommendationsController {
  private readonly getRecommendationsUseCase: GetRecommendationsUseCase;
  private readonly jwtService: JwtService;
  private readonly logger: Logger;

  constructor(deps: RecommendationsControllerDeps) {
    this.getRecommendationsUseCase = deps.getRecommendationsUseCase;
    this.jwtService = deps.jwtService;
    this.logger = deps.logger?.child({ name: 'RecommendationsController' }) ?? noopLogger;
  }

  /**
   * GET /api/books/recommendations
   *
   * Returns personalized book recommendations for the authenticated user.
   *
   * @returns 200 { items: RecommendationItem[], label: string } on success
   * @returns 200 { items: [], label: '' } when user has no history
   * @returns 401 if not authenticated
   */
  async getRecommendations(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    this.logger.debug('Received get recommendations request');

    try {
      // 1. Require authentication
      const userId = await requireAuth(request, reply, this.jwtService);

      // If requireAuth sent a 401, reply is already sent — stop processing
      if (reply.sent) {
        return reply;
      }

      // 2. Execute use case
      const result = await this.getRecommendationsUseCase.execute(userId.value);

      this.logger.info('Recommendations fetched', {
        userId: userId.value,
        count: result.items.length,
      });

      return reply.status(200).send(successResponse(result));
    } catch (error) {
      // If reply was already sent (401 from requireAuth), just return
      if (reply.sent) {
        return reply;
      }

      const errorResponse = mapErrorToHttpResponse(error);

      if (errorResponse.statusCode >= 500) {
        this.logger.error('Unexpected error fetching recommendations', {
          error: error instanceof Error ? error.message : String(error),
        });
      }

      return reply.status(errorResponse.statusCode).send(errorResponse.body);
    }
  }
}
