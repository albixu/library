/**
 * Book Levels Routes
 *
 * Fastify route definitions for book level-related endpoints.
 * Routes are registered as a Fastify plugin for modularity.
 *
 * Part of HU-010: List Book Levels Endpoint
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import type { BookLevelsController } from '../controllers/BookLevelsController.js';

/**
 * Options for registering book levels routes
 */
export interface BookLevelsRoutesOptions extends FastifyPluginOptions {
  controller: BookLevelsController;
}

/**
 * Registers book levels routes on a Fastify instance
 *
 * Endpoints:
 * - GET /api/book-levels - List all levels sorted alphabetically (optional type filter)
 *
 * @param fastify - Fastify instance
 * @param options - Route options including controller
 */
export async function bookLevelsRoutes(
  fastify: FastifyInstance,
  options: BookLevelsRoutesOptions,
): Promise<void> {
  const { controller } = options;

  /**
   * GET /api/book-levels
   * Retrieves all book levels sorted alphabetically
   * Optional query param: ?type=<typeName> for filtering by type
   */
  fastify.get('/book-levels', async (request, reply) => {
    return controller.list(request, reply);
  });
}
