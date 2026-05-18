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
import { SendBookByEmailUseCase } from './application/use-cases/SendBookByEmailUseCase.js';
import { ToggleFavoriteUseCase } from './application/use-cases/favorite/ToggleFavoriteUseCase.js';
import { RegisterDownloadUseCase } from './application/use-cases/download/RegisterDownloadUseCase.js';
import { GetRecommendationsUseCase } from './application/use-cases/GetRecommendationsUseCase.js';
import { LoginUseCase } from './application/use-cases/auth/LoginUseCase.js';
import { LogoutUseCase } from './application/use-cases/auth/LogoutUseCase.js';
import { RefreshTokenUseCase } from './application/use-cases/auth/RefreshTokenUseCase.js';
import { ForgotPasswordUseCase } from './application/use-cases/auth/ForgotPasswordUseCase.js';
import { ResetPasswordUseCase } from './application/use-cases/auth/ResetPasswordUseCase.js';
import { JwtServiceImpl } from './infrastructure/driven/auth/JwtServiceImpl.js';
import { Argon2PasswordHasher } from './infrastructure/driven/auth/Argon2PasswordHasher.js';
import { DrizzleUserRepository } from './infrastructure/driven/persistence/DrizzleUserRepository.js';
import { DrizzlePasswordResetTokenRepository } from './infrastructure/driven/persistence/DrizzlePasswordResetTokenRepository.js';
import { DrizzleFavoriteRepository } from './infrastructure/driven/persistence/DrizzleFavoriteRepository.js';
import { DrizzleDownloadRepository } from './infrastructure/driven/persistence/DrizzleDownloadRepository.js';
import { GmailEmailAdapter } from './infrastructure/driven/email/GmailEmailAdapter.js';
import { NodeFileSystemAdapter } from './infrastructure/driven/filesystem/NodeFileSystemAdapter.js';
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

    // HU-039: Favorites repository (needed by SearchBooksUseCase for decoration)
    const favoriteRepository = new DrizzleFavoriteRepository(db);

    const searchBooksUseCase = new SearchBooksUseCase({
      bookRepository,
      embeddingService,
      favoriteRepository,
      logger,
    });

    // HU-036: Send book by email use case
    const { user: gmailUser, appPassword: gmailAppPassword } = env.gmail;
    if (!gmailUser || !gmailAppPassword) {
      throw new Error(
        'GMAIL_USER and GMAIL_APP_PASSWORD environment variables are required to start the API server. ' +
        'Please set them in your environment or .env file.',
      );
    }
    const emailAdapter = new GmailEmailAdapter({
      user: gmailUser,
      appPassword: gmailAppPassword,
    });
    const fileSystemAdapter = new NodeFileSystemAdapter();

    // HU-038: Auth adapters and use cases
    const jwtService = new JwtServiceImpl(env.jwt.secret, env.jwt.refreshSecret);
    const passwordHasher = new Argon2PasswordHasher();
    const userRepository = new DrizzleUserRepository(db);
    const passwordResetTokenRepository = new DrizzlePasswordResetTokenRepository(db);

    const loginUseCase = new LoginUseCase({ userRepository, passwordHasher, jwtService });
    const logoutUseCase = new LogoutUseCase();
    const refreshTokenUseCase = new RefreshTokenUseCase({ userRepository, jwtService });
    const forgotPasswordUseCase = new ForgotPasswordUseCase({
      userRepository,
      tokenRepository: passwordResetTokenRepository,
      emailPort: emailAdapter,
      appBaseUrl: env.jwt.appBaseUrl,
    });
    const resetPasswordUseCase = new ResetPasswordUseCase({
      tokenRepository: passwordResetTokenRepository,
      userRepository,
      passwordHasher,
    });

    // HU-039: Favorites and downloads use cases
    const downloadRepository = new DrizzleDownloadRepository(db);
    const toggleFavoriteUseCase = new ToggleFavoriteUseCase({ favoriteRepository });
    const registerDownloadUseCase = new RegisterDownloadUseCase({ downloadRepository });

    // HU-036: Send book by email use case — wired after registerDownloadUseCase (HU-039)
    const sendBookByEmailUseCase = new SendBookByEmailUseCase({
      bookRepository,
      fileSystemPort: fileSystemAdapter,
      emailPort: emailAdapter,
      registerDownloadUseCase,
    });

    // HU-040: Recommendations use case
    const getRecommendationsUseCase = new GetRecommendationsUseCase({
      downloadRepository,
      bookRepository,
      favoriteRepository,
    });

    // Create and start server
    const server = await createServer(
      {
        createBookUseCase,
        searchBooksUseCase,
        listBookTypesUseCase,
        listCategoriesUseCase,
        listBookLevelsUseCase,
        sendBookByEmailUseCase,
        toggleFavoriteUseCase,
        registerDownloadUseCase,
        getRecommendationsUseCase,
        loginUseCase,
        logoutUseCase,
        refreshTokenUseCase,
        forgotPasswordUseCase,
        resetPasswordUseCase,
        jwtService,
        logger,
      },
      { prefix: '/api', nodeEnv: env.app.nodeEnv },
    );

    // Add health endpoint for Docker healthcheck
    server.get('/health', async () => ({ status: 'ok' }));

    await startServer(server, env.app.port);

    bootstrapLogger.info(`Server listening on port ${env.app.port}`, {
      url: `http://localhost:${env.app.port}`,
      healthUrl: `http://localhost:${env.app.port}/health`,
      apiUrl: `http://localhost:${env.app.port}/api`,
      ...(env.app.nodeEnv !== 'production' && { swaggerUrl: `http://localhost:${env.app.port}/docs` }),
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
