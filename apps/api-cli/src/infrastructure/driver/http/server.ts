/**
 * Fastify Server Factory
 *
 * Creates and configures a Fastify server instance.
 * Uses dependency injection to allow different configurations
 * for production, development, and testing.
 */

import Fastify, { FastifyInstance } from 'fastify';
import type { Logger } from '../../../application/ports/Logger.js';
import { noopLogger } from '../../../application/ports/Logger.js';
import { BooksController } from './controllers/BooksController.js';
import { booksRoutes } from './routes/books.routes.js';
import type { CreateBookUseCase } from '../../../application/use-cases/CreateBookUseCase.js';

/**
 * Dependencies required by the server
 */
export interface ServerDeps {
  createBookUseCase: CreateBookUseCase;
  logger?: Logger;
}

/**
 * Server options
 */
export interface ServerOptions {
  /** API prefix for all routes (default: '/api') */
  prefix?: string;
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
  options: ServerOptions = {}
): Promise<FastifyInstance> {
  const { createBookUseCase, logger = noopLogger } = deps;
  const { prefix = '/api' } = options;

  const serverLogger = logger.child({ name: 'FastifyServer' });

  // Create Fastify instance with custom logger adapter
  const fastify = Fastify({
    logger: false, // We use our own logger
  });

  // Create controller with dependencies
  const booksController = new BooksController({
    createBookUseCase,
    logger,
  });

  // Register routes with prefix
  await fastify.register(booksRoutes, {
    prefix,
    controller: booksController,
  });

  // Log server ready
  fastify.addHook('onReady', async () => {
    serverLogger.info('Server routes registered', {
      prefix,
      routes: [
        { method: 'POST', path: `${prefix}/books` },
      ],
    });
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
  host: string = '0.0.0.0'
): Promise<void> {
  await server.listen({ port, host });
}
