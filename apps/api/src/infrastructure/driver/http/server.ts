/**
 * Fastify Server Factory
 *
 * Creates and configures a Fastify server instance.
 * Uses dependency injection to allow different configurations
 * for production, development, and testing.
 *
 * HU-012: Added SearchBooksController and GET /api/books endpoint
 * HU-032: Added optional Swagger UI (disabled in production)
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import type { OpenAPIV3 } from 'openapi-types';
import Fastify, { type FastifyInstance } from 'fastify';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import type { Logger } from '../../../application/ports/Logger.js';
import { noopLogger } from '../../../application/ports/Logger.js';
import { BooksController } from './controllers/BooksController.js';
import { SearchBooksController } from './controllers/SearchBooksController.js';
import { BookTypesController } from './controllers/BookTypesController.js';
import { CategoriesController } from './controllers/CategoriesController.js';
import { BookLevelsController } from './controllers/BookLevelsController.js';
import { booksRoutes } from './routes/books.routes.js';
import { bookTypesRoutes } from './routes/book-types.routes.js';
import { categoriesRoutes } from './routes/categories.routes.js';
import { bookLevelsRoutes } from './routes/book-levels.routes.js';
import type { CreateBookUseCase } from '../../../application/use-cases/CreateBookUseCase.js';
import type { SearchBooksUseCase } from '../../../application/use-cases/SearchBooksUseCase.js';
import type { ListBookTypesUseCase } from '../../../application/use-cases/ListBookTypesUseCase.js';
import type { ListCategoriesUseCase } from '../../../application/use-cases/ListCategoriesUseCase.js';
import type { ListBookLevelsUseCase } from '../../../application/use-cases/ListBookLevelsUseCase.js';

/**
 * Dependencies required by the server
 */
export interface ServerDeps {
  createBookUseCase: CreateBookUseCase;
  searchBooksUseCase: SearchBooksUseCase;
  listBookTypesUseCase: ListBookTypesUseCase;
  listCategoriesUseCase: ListCategoriesUseCase;
  listBookLevelsUseCase: ListBookLevelsUseCase;
  logger?: Logger;
}

/**
 * Server options
 */
export interface ServerOptions {
  /** API prefix for all routes (default: '/api') */
  prefix?: string;
  /** Node environment — Swagger UI is only registered outside production (default: 'production') */
  nodeEnv?: string;
}

/**
 * Creates a Fastify server instance with all routes registered
 *
 * @param deps - Server dependencies (use cases, logger)
 * @param options - Server configuration options
 * @returns Configured Fastify instance
 */
export async function createServer(
  deps: ServerDeps,
  options: ServerOptions = {},
): Promise<FastifyInstance> {
  const { createBookUseCase, searchBooksUseCase, listBookTypesUseCase, listCategoriesUseCase, listBookLevelsUseCase, logger = noopLogger } = deps;
  const { prefix = '/api', nodeEnv = 'production' } = options;

  const serverLogger = logger.child({ name: 'FastifyServer' });

  // Create Fastify instance with custom logger adapter
  const fastify = Fastify({
    logger: false, // We use our own logger
  });

  // Register Swagger UI only in development and test environments
  const enableSwagger = nodeEnv === 'development' || nodeEnv === 'test';
  if (enableSwagger) {
    const openapiSpecPath = resolve('/app/docs/api/openapi.yaml');
    const openapiSpec = parseYaml(readFileSync(openapiSpecPath, 'utf-8')) as OpenAPIV3.Document;

    await fastify.register(fastifySwagger, {
      mode: 'static',
      specification: {
        document: openapiSpec,
      },
    });

    await fastify.register(fastifySwaggerUi, {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: true,
      },
    });

    serverLogger.info('Swagger UI enabled', { url: '/docs' });
  }

  // Create controllers with dependencies
  const booksController = new BooksController({
    createBookUseCase,
    logger,
  });

  const searchBooksController = new SearchBooksController({
    searchBooksUseCase,
    logger,
  });

  const bookTypesController = new BookTypesController({
    listBookTypesUseCase,
    logger,
  });

  const categoriesController = new CategoriesController({
    listCategoriesUseCase,
    logger,
  });

  const bookLevelsController = new BookLevelsController({
    listBookLevelsUseCase,
    logger,
  });

  // Register routes with prefix
  await fastify.register(booksRoutes, {
    prefix,
    controller: booksController,
    searchController: searchBooksController,
  });

  await fastify.register(bookTypesRoutes, {
    prefix,
    controller: bookTypesController,
  });

  await fastify.register(categoriesRoutes, {
    prefix,
    controller: categoriesController,
  });

  await fastify.register(bookLevelsRoutes, {
    prefix,
    controller: bookLevelsController,
  });

  // Log server ready
  fastify.addHook('onReady', async () => {
    const routes = [
      { method: 'GET', path: `${prefix}/books` },
      { method: 'POST', path: `${prefix}/books` },
      { method: 'GET', path: `${prefix}/book-types` },
      { method: 'GET', path: `${prefix}/book-categories` },
      { method: 'GET', path: `${prefix}/book-levels` },
    ];
    if (enableSwagger) {
      routes.push({ method: 'GET', path: '/docs' });
    }
    serverLogger.info('Server routes registered', { prefix, routes });
  });

  return fastify;
}

/**
 * Starts the server on the specified port
 *
 * @param server - Fastify instance
 * @param port - Port number to listen on
 * @param host - Host address (default: '0.0.0.0')
 */
export async function startServer(
  server: FastifyInstance,
  port: number,
  host = '0.0.0.0',
): Promise<void> {
  await server.listen({ port, host });
}
