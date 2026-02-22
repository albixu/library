/**
 * Books Routes
 *
 * Fastify route definitions for book-related endpoints.
 * Routes are registered as a Fastify plugin for modularity.
 *
 * HU-012: Added GET /api/books for searching books with filters and pagination
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import type { BooksController } from '../controllers/BooksController.js';
import type { SearchBooksController } from '../controllers/SearchBooksController.js';

/**
 * Options for registering book routes
 */
export interface BooksRoutesOptions extends FastifyPluginOptions {
  controller: BooksController;
  searchController: SearchBooksController;
}

/**
 * Registers book routes on a Fastify instance
 *
 * Endpoints:
 * - GET /api/books - Search books with filters and pagination
 * - POST /api/books - Create a new book
 *
 * @param fastify - Fastify instance
 * @param options - Route options including controllers
 */
export async function booksRoutes(
  fastify: FastifyInstance,
  options: BooksRoutesOptions,
): Promise<void> {
  const { controller, searchController } = options;

  /**
   * GET /api/books
   * Searches books with filters and pagination (HU-012)
   */
  fastify.get('/books', async (request, reply) => {
    return searchController.search(request, reply);
  });

  /**
   * POST /api/books
   * Creates a new book in the catalog
   */
  fastify.post('/books', async (request, reply) => {
    return controller.create(request, reply);
  });
}
