/**
 * HTTP Driver Layer
 *
 * Contains HTTP-related infrastructure (Fastify routes, controllers, schemas).
 * This is the "driver" or "input" side of the hexagonal architecture.
 */

export * from './controllers/BooksController.js';
export * from './routes/books.routes.js';
export * from './schemas/book.schemas.js';
export * from './errors/HttpErrorMapper.js';
export * from './server.js';
