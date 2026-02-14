/**
 * Persistence Adapters
 *
 * Re-exports all persistence-related implementations.
 */

export { PostgresCategoryRepository } from './PostgresCategoryRepository.js';
export { PostgresBookRepository, normalizeForDuplicateCheck } from './PostgresBookRepository.js';
export { PostgresAuthorRepository } from './PostgresAuthorRepository.js';
export * from './drizzle/schema.js';
export * from './mappers/index.js';
