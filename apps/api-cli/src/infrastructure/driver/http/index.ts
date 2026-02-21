/**
 * HTTP Driver Layer
 *
 * Contains HTTP-related infrastructure (Fastify routes, controllers, schemas).
 * This is the "driver" or "input" side of the hexagonal architecture.
 */

export * from './controllers/BooksController.js';
export * from './controllers/BookTypesController.js';
export * from './controllers/CategoriesController.js';
export * from './routes/books.routes.js';
export * from './routes/book-types.routes.js';
export * from './routes/categories.routes.js';
export * from './schemas/book.schemas.js';
export * from './schemas/category.schemas.js';
export * from './errors/HttpErrorMapper.js';
export * from './server.js';
