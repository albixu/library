/**
 * Development Server Entrypoint
 *
 * Bootstraps all dependencies and starts the HTTP server.
 * This file is the entry point for the development Docker container.
 */

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { loadEnvConfig } from './infrastructure/config/env.js';
import { PinoLogger } from './infrastructure/driven/logging/PinoLogger.js';
import { OllamaEmbeddingService } from './infrastructure/driven/embedding/OllamaEmbeddingService.js';
import { OllamaTranslationService } from './infrastructure/driven/translation/OllamaTranslationService.js';
import { LibreTranslateTranslationService } from './infrastructure/driven/translation/LibreTranslateTranslationService.js';
import { PostgresBookRepository } from './infrastructure/driven/persistence/PostgresBookRepository.js';
import { PostgresCategoryRepository } from './infrastructure/driven/persistence/PostgresCategoryRepository.js';
import { PostgresTypeRepository } from './infrastructure/driven/persistence/PostgresTypeRepository.js';
import { PostgresAuthorRepository } from './infrastructure/driven/persistence/PostgresAuthorRepository.js';
import { PostgresLevelRepository } from './infrastructure/driven/persistence/PostgresLevelRepository.js';
import type { DatabaseClient } from './infrastructure/driven/persistence/types.js';
import { CreateBookUseCase } from './application/use-cases/CreateBookUseCase.js';
import { SearchBooksUseCase } from './application/use-cases/SearchBooksUseCase.js';
import { ListBookTypesUseCase } from './application/use-cases/ListBookTypesUseCase.js';
import { ListCategoriesUseCase } from './application/use-cases/ListCategoriesUseCase.js';
import { ListBookLevelsUseCase } from './application/use-cases/ListBookLevelsUseCase.js';
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
    const db: DatabaseClient = drizzle(pool, { schema });

    bootstrapLogger.info('Database connection established');

    // Run pending migrations (idempotent - only applies new migrations)
    // Note: In production, migrations run automatically on startup
    if (env.app.nodeEnv === 'production') {
      bootstrapLogger.info('Running database migrations...');
      await migrate(db, { migrationsFolder: './drizzle' });
      bootstrapLogger.info('Database migrations completed');
    }

    // Initialize adapters
    const embeddingService = new OllamaEmbeddingService({
      baseUrl: env.ollama.baseUrl,
      model: env.ollama.model,
    });

    // HU-013 / HU-026: Translation service — Strategy pattern via TRANSLATION_PROVIDER
    let translationService;
    if (env.translation.provider === 'libretranslate') {
      bootstrapLogger.info('Translation provider: LibreTranslate', {
        url: env.translation.libreTranslateUrl,
      });
      translationService = new LibreTranslateTranslationService({
        baseUrl: env.translation.libreTranslateUrl,
        timeoutMs: env.translation.libreTranslateTimeoutMs,
        retries: env.translation.retries,
      });
    } else {
      bootstrapLogger.info('Translation provider: Ollama', {
        url: env.translation.baseUrl,
        model: env.translation.model,
      });
      translationService = new OllamaTranslationService({
        baseUrl: env.translation.baseUrl,
        model: env.translation.model,
        timeoutMs: env.translation.timeoutMs,
        retries: env.translation.retries,
      });
    }

    const bookRepository = new PostgresBookRepository(db);
    const categoryRepository = new PostgresCategoryRepository(db);
    const typeRepository = new PostgresTypeRepository(db);
    const authorRepository = new PostgresAuthorRepository(db);
    const levelRepository = new PostgresLevelRepository(db);

    // Initialize use cases
    const createBookUseCase = new CreateBookUseCase({
      bookRepository,
      categoryRepository,
      typeRepository,
      authorRepository,
      levelRepository,
      embeddingService,
      translationService, // HU-013
      logger,
    });

    const listBookTypesUseCase = new ListBookTypesUseCase(typeRepository);

    const listCategoriesUseCase = new ListCategoriesUseCase(
      categoryRepository,
      typeRepository,
    );

    const listBookLevelsUseCase = new ListBookLevelsUseCase(
      levelRepository,
      typeRepository,
    );

    const searchBooksUseCase = new SearchBooksUseCase({
      bookRepository,
      embeddingService,
      logger,
    });

    // Create and start server
    const server = await createServer(
      { createBookUseCase, searchBooksUseCase, listBookTypesUseCase, listCategoriesUseCase, listBookLevelsUseCase, logger },
      { prefix: '/api' },
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
    bootstrapLogger.error('Failed to start server', { 
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}

bootstrap();
