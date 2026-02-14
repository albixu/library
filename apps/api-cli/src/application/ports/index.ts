/**
 * Application Ports barrel export
 */

export type {
  EmbeddingService,
  EmbeddingServiceConfig,
  EmbeddingResult,
} from './EmbeddingService.js';

export type {
  BookRepository,
  SaveBookParams,
  DuplicateCheckResult,
} from './BookRepository.js';

export type { CategoryRepository } from './CategoryRepository.js';

export type { AuthorRepository } from './AuthorRepository.js';

export type { Logger, LogContext, ChildLoggerOptions } from './Logger.js';
export { noopLogger } from './Logger.js';
