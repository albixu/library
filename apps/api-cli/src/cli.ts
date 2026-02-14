/**
 * CLI Entry Point
 *
 * Main entry point for the Library CLI application.
 * Sets up dependencies and registers all commands.
 *
 * Usage:
 *   npm run cli -- add -t "Title" -a "Author" ...
 *   npx tsx src/cli.ts add -t "Title" -a "Author" ...
 */

import { Command } from 'commander';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

import { loadEnvConfig } from './infrastructure/config/env.js';
import { CreateBookUseCase } from './application/use-cases/CreateBookUseCase.js';
import { OllamaEmbeddingService } from './infrastructure/driven/embedding/OllamaEmbeddingService.js';
import { PostgresBookRepository } from './infrastructure/driven/persistence/PostgresBookRepository.js';
import { PostgresCategoryRepository } from './infrastructure/driven/persistence/PostgresCategoryRepository.js';
import { PostgresTypeRepository } from './infrastructure/driven/persistence/PostgresTypeRepository.js';
import { PostgresAuthorRepository } from './infrastructure/driven/persistence/PostgresAuthorRepository.js';
import { createLogger } from './infrastructure/driven/logging/PinoLogger.js';
import { createAddCommand } from './infrastructure/driver/cli/commands/add.js';
import * as schema from './infrastructure/driven/persistence/drizzle/schema.js';

const { Pool } = pg;

/**
 * Creates and configures the CLI program with all dependencies
 */
async function createCLI(): Promise<Command> {
  // Load configuration
  const config = loadEnvConfig();

  // Create logger
  const logger = createLogger({
    level: config.app.logLevel,
    prettyPrint: config.app.nodeEnv === 'development',
  });

  const log = logger.child({ name: 'CLI' });

  log.debug('Initializing CLI', {
    environment: config.app.nodeEnv,
  });

  // Create database connection pool
  const pool = new Pool({
    connectionString: config.database.url,
  });

  // Create Drizzle instance with schema for query builder support
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = drizzle(pool, { schema }) as any;

  // Create adapters (driven)
  const embeddingService = new OllamaEmbeddingService({
    baseUrl: config.ollama.baseUrl,
    model: config.ollama.model,
    timeoutMs: config.ollama.timeoutMs,
  });

  const bookRepository = new PostgresBookRepository(db);
  const categoryRepository = new PostgresCategoryRepository(db);
  const typeRepository = new PostgresTypeRepository(db);
  const authorRepository = new PostgresAuthorRepository(db);

  // Create use cases
  const createBookUseCase = new CreateBookUseCase({
    bookRepository,
    categoryRepository,
    typeRepository,
    authorRepository,
    embeddingService,
    logger,
  });

  // Create main program
  const program = new Command();

  program
    .name('library')
    .description('Library management CLI')
    .version('0.1.0');

  // Register commands
  const addCommand = createAddCommand({
    createBookUseCase,
    logger,
  });

  program.addCommand(addCommand);

  // Handle cleanup on exit
  const cleanup = async () => {
    log.debug('Cleaning up database connections');
    await pool.end();
  };

  process.on('exit', () => {
    cleanup().catch(console.error);
  });

  return program;
}

/**
 * Main CLI entry point
 */
async function main(): Promise<void> {
  try {
    const program = await createCLI();
    await program.parseAsync(process.argv);
  } catch (error) {
    console.error('Fatal error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run CLI
main();
