/**
 * Categories Routes
 *
 * Fastify route definitions for category-related endpoints.
 * Routes are registered as a Fastify plugin for modularity.
 *
 * Part of HU-009: List Categories Endpoint
 * Updated in HU-010: Renamed from /categories to /book-categories for consistency
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import type { CategoriesController } from '../controllers/CategoriesController.js';

/**
 * Options for registering categories routes
 */
export interface CategoriesRoutesOptions extends FastifyPluginOptions {
  controller: CategoriesController;
}

/**
 * Registers categories routes on a Fastify instance
 *
 * Endpoints:
 * - GET /api/categories - List all categories sorted alphabetically (optional type filter)
 *
 * @param fastify - Fastify instance
 * @param options - Route options including controller
 */
export async function categoriesRoutes(
  fastify: FastifyInstance,
  options: CategoriesRoutesOptions,
): Promise<void> {
  const { controller } = options;

  /**
   * GET /api/book-categories
   * Retrieves all categories sorted alphabetically
   * Optional query param: ?type=<typeName> for filtering by type
   */
  fastify.get('/book-categories', async (request, reply) => {
    return controller.list(request, reply);
  });
}
