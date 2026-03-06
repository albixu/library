/**
 * Application Errors barrel export
 *
 * Note: EmbeddingTextTooLongError is defined in domain/errors/DomainErrors.js
 * as it represents a business rule violation (data constraint).
 * Re-exported here for backwards compatibility.
 */

export {
  EmbeddingServiceError,
  EmbeddingServiceUnavailableError,
  TranslationServiceError,
  TranslationServiceUnavailableError,
  TranslationError,
} from './ApplicationErrors.js';

// Re-export from domain for backwards compatibility
export { EmbeddingTextTooLongError } from '../../domain/errors/DomainErrors.js';
