/**
 * Books Routes
 *
 * Fastify route definitions for book-related endpoints.
 * Routes are registered as a Fastify plugin for modularity.
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import type { BooksController } from '../controllers/BooksController.js';

/**
 * Options for registering book routes
 */
export interface BooksRoutesOptions extends FastifyPluginOptions {
  controller: BooksController;
}

/**
 * Registers book routes on a Fastify instance
 *
 * Endpoints:
 * - POST /api/books - Create a new book
 *
 * @param fastify - Fastify instance
 * @param options - Route options including controller
 */
export async function booksRoutes(
  fastify: FastifyInstance,
  options: BooksRoutesOptions
): Promise<void> {
  const { controller } = options;

  /**
   * POST /api/books
   * Creates a new book in the catalog
   */
  fastify.post('/books', async (request, reply) => {
    return controller.create(request, reply);
  });
}
