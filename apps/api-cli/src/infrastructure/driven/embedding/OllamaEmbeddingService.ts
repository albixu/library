/**
 * OllamaEmbeddingService Adapter
 *
 * Implements the EmbeddingService port by connecting to Ollama's API
 * to generate text embeddings using the nomic-embed-text model.
 *
 * This is a driven/output adapter in the hexagonal architecture.
 */

import type {
  EmbeddingService,
  EmbeddingServiceConfig,
  EmbeddingResult,
} from '../../../application/ports/EmbeddingService.js';
import {
  EmbeddingServiceUnavailableError,
  EmbeddingTextTooLongError,
} from '../../../application/errors/ApplicationErrors.js';

/**
 * Maximum text length for embedding generation (characters)
 */
const MAX_TEXT_LENGTH = 7000;

/**
 * Ollama API response for embedding generation
 */
interface OllamaEmbeddingResponse {
  embedding?: number[];
}

/**
 * OllamaEmbeddingService
 *
 * Adapter that implements EmbeddingService using Ollama's REST API.
 * Handles connection errors, timeouts, and response validation.
 */
export class OllamaEmbeddingService implements EmbeddingService {
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(config: EmbeddingServiceConfig) {
    this.baseUrl = config.baseUrl;
    this.model = config.model;
    this.timeoutMs = config.timeoutMs ?? 30000;
  }

  /**
   * Generates an embedding vector for the given text using Ollama
   *
   * @param text - The text to generate an embedding for (max 7000 characters)
   * @returns Promise resolving to the embedding result
   * @throws EmbeddingTextTooLongError if text exceeds 7000 characters
   * @throws EmbeddingServiceUnavailableError if Ollama is not reachable
   */
  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    const trimmedText = text.trim();

    // Validate text length before making API call
    if (trimmedText.length > MAX_TEXT_LENGTH) {
      throw new EmbeddingTextTooLongError(trimmedText.length, MAX_TEXT_LENGTH);
    }

    const url = `${this.baseUrl}/api/embeddings`;
    const body = JSON.stringify({
      model: this.model,
      prompt: trimmedText,
    });

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      throw new EmbeddingServiceUnavailableError(this.getErrorMessage(error));
    }

    if (!response.ok) {
      throw new EmbeddingServiceUnavailableError(
        `HTTP ${response.status}: ${response.statusText}`
      );
    }

    const data = (await response.json()) as OllamaEmbeddingResponse;

    if (!data.embedding || !Array.isArray(data.embedding)) {
      throw new EmbeddingServiceUnavailableError(
        'Invalid response format: missing embedding array'
      );
    }

    return {
      embedding: data.embedding,
      model: this.model,
    };
  }

  /**
   * Checks if the Ollama service is available and healthy
   *
   * @returns Promise resolving to true if service is available, false otherwise
   */
  async isAvailable(): Promise<boolean> {
    const url = `${this.baseUrl}/api/tags`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Extracts a readable error message from an unknown error
   */
  private getErrorMessage(error: unknown): string {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return 'Request timeout';
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'Unknown error';
  }
}
