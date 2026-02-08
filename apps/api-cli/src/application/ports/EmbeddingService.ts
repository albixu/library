/**
 * EmbeddingService Port (Driven/Output Port)
 *
 * Defines the contract for generating vector embeddings from text.
 * This is a port in the hexagonal architecture - the actual implementation
 * (e.g., OllamaEmbeddingService) will be an adapter in the infrastructure layer.
 *
 * The embedding service is used to generate semantic representations of books
 * for similarity search and recommendations.
 */

/**
 * Configuration for the embedding service
 */
export interface EmbeddingServiceConfig {
  /** Base URL of the embedding service (e.g., 'http://ollama:11434') */
  baseUrl: string;
  /** Model to use for embeddings (e.g., 'nomic-embed-text') */
  model: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeoutMs?: number;
}

/**
 * Result of an embedding generation request
 */
export interface EmbeddingResult {
  /** The generated embedding vector (768 dimensions for nomic-embed-text) */
  embedding: number[];
  /** The model used to generate the embedding */
  model: string;
}

/**
 * EmbeddingService Port Interface
 *
 * Implementations must handle:
 * - Connection errors (throw EmbeddingServiceUnavailableError)
 * - Timeout errors (throw EmbeddingServiceUnavailableError)
 * - Invalid responses (throw EmbeddingServiceError)
 *
 * Note: Error classes are defined in application/errors/ApplicationErrors.ts
 */
export interface EmbeddingService {
  /**
   * Generates an embedding vector for the given text
   *
   * @param text - The text to generate an embedding for (max 7000 characters)
   * @returns Promise resolving to the embedding result
   * @throws EmbeddingServiceUnavailableError if the service is not reachable
   * @throws EmbeddingServiceError for other service-related errors
   */
  generateEmbedding(text: string): Promise<EmbeddingResult>;

  /**
   * Checks if the embedding service is available and healthy
   *
   * @returns Promise resolving to true if service is available, false otherwise
   */
  isAvailable(): Promise<boolean>;
}
