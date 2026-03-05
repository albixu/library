/**
 * OllamaEmbeddingService Adapter
 *
 * Implements the EmbeddingService port by connecting to Ollama's API
 * to generate text embeddings using the nomic-embed-text model.
 *
 * For texts that fit within the model's context window (CHUNK_SIZE), a single
 * embedding call is made. For longer texts, the input is split into overlapping
 * chunks (sliding window), an embedding is generated per chunk, and the results
 * are averaged and L2-normalized to produce a single representative vector.
 *
 * This is a driven/output adapter in the hexagonal architecture.
 */

import type {
  EmbeddingService,
  EmbeddingServiceConfig,
  EmbeddingResult,
} from '../../../application/ports/EmbeddingService.js';
import { EmbeddingServiceUnavailableError } from '../../../application/errors/ApplicationErrors.js';

/**
 * Maximum characters per chunk sent to the embedding model.
 * Set below the hard 7000-char model limit to leave a safety margin.
 */
export const CHUNK_SIZE = 6500;

/**
 * Number of characters shared between consecutive chunks.
 * Prevents losing semantic context at chunk boundaries.
 */
export const CHUNK_OVERLAP = 200;

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
 * Handles connection errors, timeouts, response validation, and long texts
 * via overlapping-chunk strategy.
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
   * Generates an embedding vector for the given text using Ollama.
   *
   * For short texts (≤ CHUNK_SIZE chars) a single API call is made and the
   * embedding is returned as-is.
   *
   * For longer texts the input is split into overlapping chunks. Each chunk
   * produces an embedding via a separate API call. The chunk embeddings are
   * averaged dimension-by-dimension and the result is L2-normalized so that
   * cosine-similarity queries remain correct.
   *
   * @param text - The text to generate an embedding for
   * @returns Promise resolving to the embedding result
   * @throws EmbeddingServiceUnavailableError if Ollama is not reachable
   */
  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    const trimmedText = text.trim();
    const chunks = this.splitIntoChunks(trimmedText, CHUNK_SIZE, CHUNK_OVERLAP);

    if (chunks.length === 1) {
      // Fast path: single chunk — no averaging needed
      return this.generateSingleEmbedding(chunks[0]!);
    }

    // Multi-chunk path: generate one embedding per chunk then average + normalize
    const embeddings = await Promise.all(
      chunks.map(chunk => this.generateSingleEmbedding(chunk).then(r => r.embedding))
    );

    const averaged = this.averageVectors(embeddings);
    const normalized = this.normalizeL2(averaged);

    return { embedding: normalized, model: this.model };
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
   * Splits text into overlapping chunks using a sliding window.
   *
   * If the text fits within chunkSize, returns [text] unchanged.
   * Otherwise produces chunks of length chunkSize, each starting
   * `chunkSize - overlap` characters after the previous one.
   * The last chunk may be shorter than chunkSize.
   *
   * @param text      - Input text (already trimmed)
   * @param chunkSize - Maximum characters per chunk
   * @param overlap   - Characters shared between consecutive chunks
   */
  splitIntoChunks(text: string, chunkSize: number, overlap: number): string[] {
    if (text.length <= chunkSize) {
      return [text];
    }

    const chunks: string[] = [];
    const step = chunkSize - overlap;
    let start = 0;

    while (start < text.length) {
      chunks.push(text.slice(start, start + chunkSize));
      start += step;
    }

    return chunks;
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  /**
   * Makes a single embedding API call for the given text chunk.
   *
   * @throws EmbeddingServiceUnavailableError on any network or API error
   */
  private async generateSingleEmbedding(text: string): Promise<EmbeddingResult> {
    const url = `${this.baseUrl}/api/embeddings`;
    const body = JSON.stringify({ model: this.model, prompt: text });

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
        `HTTP ${response.status}: ${response.statusText}`,
      );
    }

    let data: OllamaEmbeddingResponse;
    try {
      data = (await response.json()) as OllamaEmbeddingResponse;
    } catch (error) {
      throw new EmbeddingServiceUnavailableError(
        `Failed to parse response: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { cause: error },
      );
    }

    if (!data.embedding || !Array.isArray(data.embedding)) {
      throw new EmbeddingServiceUnavailableError(
        'Invalid response format: missing embedding array',
      );
    }

    return { embedding: data.embedding, model: this.model };
  }

  /**
   * Averages multiple equal-length vectors dimension by dimension.
   */
  private averageVectors(vectors: number[][]): number[] {
    const dims = vectors[0]!.length;
    const sum = new Array<number>(dims).fill(0);

    for (const vec of vectors) {
      for (let i = 0; i < dims; i++) {
        sum[i]! += vec[i]!;
      }
    }

    return sum.map(v => v / vectors.length);
  }

  /**
   * Normalizes a vector to unit length (L2 norm).
   * If the vector is the zero vector, returns it unchanged to avoid NaN.
   */
  private normalizeL2(vector: number[]): number[] {
    const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    if (norm === 0) return vector;
    return vector.map(v => v / norm);
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
