/**
 * Book Types Routes
 *
 * Fastify route definitions for book type-related endpoints.
 * Routes are registered as a Fastify plugin for modularity.
 *
 * Part of HU-005: List Book Types Endpoint
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import type { BookTypesController } from '../controllers/BookTypesController.js';

/**
 * Options for registering book types routes
 */
export interface BookTypesRoutesOptions extends FastifyPluginOptions {
  controller: BookTypesController;
}

/**
 * Registers book types routes on a Fastify instance
 *
 * Endpoints:
 * - GET /api/book-types - List all book types sorted alphabetically
 *
 * @param fastify - Fastify instance
 * @param options - Route options including controller
 */
export async function bookTypesRoutes(
  fastify: FastifyInstance,
  options: BookTypesRoutesOptions,
): Promise<void> {
  const { controller } = options;

  /**
   * GET /api/book-types
   * Retrieves all book types sorted alphabetically
   */
  fastify.get('/book-types', async (request, reply) => {
    return controller.list(request, reply);
  });
}
