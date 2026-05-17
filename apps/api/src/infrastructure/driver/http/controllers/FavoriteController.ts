/**
 * FavoriteController
 *
 * HTTP request handler for the POST /api/books/:id/favorite endpoint.
 * Follows the thin controller pattern — delegates business logic to use cases.
 *
 * HU-039: Toggle favorite HTTP controller.
 */

import type { FastifyReply, FastifyRequest } from 'fastify';
import type { ToggleFavoriteUseCase } from '../../../../application/use-cases/favorite/ToggleFavoriteUseCase.js';
import type { JwtService } from '../../../../domain/user/ports/JwtService.js';
import type { Logger } from '../../../../application/ports/Logger.js';
import { noopLogger } from '../../../../application/ports/Logger.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { successResponse } from '../schemas/common.schemas.js';
import { mapErrorToHttpResponse } from '../errors/HttpErrorMapper.js';
import { BookId } from '../../../../domain/book/value-objects/BookId.js';

/**
 * Dependencies required by FavoriteController
 */
export interface FavoriteControllerDeps {
  toggleFavoriteUseCase: ToggleFavoriteUseCase;
  jwtService: JwtService;
  logger?: Logger;
}

/**
 * FavoriteController
 *
 * Handles HTTP requests for favorite book operations.
 */
export class FavoriteController {
  private readonly toggleFavoriteUseCase: ToggleFavoriteUseCase;
  private readonly jwtService: JwtService;
  private readonly logger: Logger;

  constructor(deps: FavoriteControllerDeps) {
    this.toggleFavoriteUseCase = deps.toggleFavoriteUseCase;
    this.jwtService = deps.jwtService;
    this.logger = deps.logger?.child({ name: 'FavoriteController' }) ?? noopLogger;
  }

  /**
   * POST /api/books/:id/favorite
   *
   * Toggles a book as favorite for the authenticated user.
   *
   * @returns 200 { favorite: boolean } on success
   * @returns 401 if not authenticated
   * @returns 404 if the book does not exist
   */
  async toggleFavorite(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    const bookIdRaw = request.params.id;
    this.logger.debug('Received toggle favorite request', { bookId: bookIdRaw });

    try {
      // 1. Require authentication
      const userId = await requireAuth(request, reply, this.jwtService);

      // If requireAuth sent a 401, reply is already sent — stop processing
      if (reply.sent) {
        return reply;
      }

      // 2. Validate bookId
      const bookId = BookId.create(bookIdRaw);

      // 3. Execute use case
      const result = await this.toggleFavoriteUseCase.execute({ userId, bookId });

      this.logger.info('Favorite toggled', { bookId: bookIdRaw, favorite: result.favorite });

      return reply.status(200).send(successResponse(result));
    } catch (error) {
      // If reply was already sent (401 from requireAuth), just return
      if (reply.sent) {
        return reply;
      }

      const errorResponse = mapErrorToHttpResponse(error);

      if (errorResponse.statusCode >= 500) {
        this.logger.error('Unexpected error toggling favorite', {
          bookId: bookIdRaw,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      return reply.status(errorResponse.statusCode).send(errorResponse.body);
    }
  }
}
