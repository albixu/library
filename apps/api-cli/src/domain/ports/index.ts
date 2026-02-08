/**
 * Domain Ports barrel export
 *
 * Ports define the contracts for communication between the domain and the outside world.
 * These are interfaces that will be implemented by adapters in the infrastructure layer.
 */

// Driven Ports (Output/Secondary Ports)
// These define what the domain NEEDS from the outside world
export type {
  BookRepository,
  SaveBookParams,
  DuplicateCheckResult,
} from './driven/BookRepository.js';

export type { CategoryRepository } from './driven/CategoryRepository.js';

export type {
  EmbeddingService,
  EmbeddingServiceConfig,
  EmbeddingResult,
} from './driven/EmbeddingService.js';

// Driver Ports (Input/Primary Ports)
// These define what the domain OFFERS to the outside world
// (To be added as needed, e.g., BookService interface)
