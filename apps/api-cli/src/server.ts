/**
 * Development Server Entrypoint
 *
 * Bootstraps all dependencies and starts the HTTP server.
 * This file is the entry point for the development Docker container.
 */

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { loadEnvConfig } from './infrastructure/config/env.js';
import { PinoLogger } from './infrastructure/driven/logging/PinoLogger.js';
import { OllamaEmbeddingService } from './infrastructure/driven/embedding/OllamaEmbeddingService.js';
import { PostgresBookRepository } from './infrastructure/driven/persistence/PostgresBookRepository.js';
import { PostgresCategoryRepository } from './infrastructure/driven/persistence/PostgresCategoryRepository.js';
import { CreateBookUseCase } from './application/use-cases/CreateBookUseCase.js';
import { createServer, startServer } from './infrastructure/driver/http/server.js';
import * as schema from './infrastructure/driven/persistence/drizzle/schema.js';

async function bootstrap(): Promise<void> {
  // Load environment configuration
  const env = loadEnvConfig();

  // Initialize logger
  const isPretty = env.app.nodeEnv !== 'production' && env.app.nodeEnv !== 'test';
  const logger = new PinoLogger({ level: env.app.logLevel, prettyPrint: isPretty });
  const bootstrapLogger = logger.child({ name: 'Bootstrap' });

  bootstrapLogger.info('Starting Library API server...', { 
    nodeEnv: env.app.nodeEnv,
    port: env.app.port,
  });

  try {
    // Database connection
    const pool = new Pool({ connectionString: env.database.url });
    const db = drizzle(pool, { schema });

    bootstrapLogger.info('Database connection established');

    // Initialize adapters
    const embeddingService = new OllamaEmbeddingService({
      baseUrl: env.ollama.baseUrl,
      model: env.ollama.model,
    });

    const bookRepository = new PostgresBookRepository(db as any);
    const categoryRepository = new PostgresCategoryRepository(db as any);

    // Initialize use cases
    const createBookUseCase = new CreateBookUseCase({
      bookRepository,
      categoryRepository,
      embeddingService,
      logger,
    });

    // Create and start server
    const server = await createServer(
      { createBookUseCase, logger },
      { prefix: '/api' }
    );

    // Add health endpoint for Docker healthcheck
    server.get('/health', async () => ({ status: 'ok' }));

    await startServer(server, env.app.port);

    bootstrapLogger.info(`Server listening on port ${env.app.port}`, {
      url: `http://localhost:${env.app.port}`,
      healthUrl: `http://localhost:${env.app.port}/health`,
      apiUrl: `http://localhost:${env.app.port}/api`,
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      bootstrapLogger.info(`Received ${signal}, shutting down gracefully...`);
      await server.close();
      await pool.end();
      bootstrapLogger.info('Server shut down successfully');
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    bootstrapLogger.error('Failed to start server', { error });
    process.exit(1);
  }
}

bootstrap();
