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
import type { SendBookByEmailController } from '../controllers/SendBookByEmailController.js';
import type { FavoriteController } from '../controllers/FavoriteController.js';
import type { RecommendationsController } from '../controllers/RecommendationsController.js';

/**
 * Options for registering book routes
 */
export interface BooksRoutesOptions extends FastifyPluginOptions {
  controller: BooksController;
  searchController: SearchBooksController;
  sendBookByEmailController: SendBookByEmailController;
  favoriteController?: FavoriteController;
  recommendationsController?: RecommendationsController;
}

/**
 * Registers book routes on a Fastify instance
 *
 * Endpoints:
 * - GET /api/books - Search books with filters and pagination
 * - POST /api/books - Create a new book
 * - POST /api/books/:id/send - Send a book by email (HU-036)
 * - POST /api/books/:id/favorite - Toggle favorite (HU-039)
 *
 * @param fastify - Fastify instance
 * @param options - Route options including controllers
 */
export async function booksRoutes(
  fastify: FastifyInstance,
  options: BooksRoutesOptions,
): Promise<void> {
  const { controller, searchController, sendBookByEmailController, favoriteController, recommendationsController } = options;

  /**
   * GET /api/books/recommendations
   * Returns personalized book recommendations for the authenticated user (HU-040)
   * IMPORTANT: Must be registered BEFORE /books/:id to avoid route conflict
   */
  if (recommendationsController) {
    fastify.get('/books/recommendations', async (request, reply) => {
      return recommendationsController.getRecommendations(request, reply);
    });
  }

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

  /**
   * POST /api/books/:id/send
   * Sends a book file to the given email address (HU-036)
   */
  fastify.post('/books/:id/send', async (request, reply) => {
    return sendBookByEmailController.send(
      request as Parameters<typeof sendBookByEmailController.send>[0],
      reply,
    );
  });

  /**
   * POST /api/books/:id/favorite
   * Toggles a book as favorite for the authenticated user (HU-039)
   */
  if (favoriteController) {
    fastify.post('/books/:id/favorite', async (request, reply) => {
      return favoriteController.toggleFavorite(
        request as Parameters<typeof favoriteController.toggleFavorite>[0],
        reply,
      );
    });
  }
}
