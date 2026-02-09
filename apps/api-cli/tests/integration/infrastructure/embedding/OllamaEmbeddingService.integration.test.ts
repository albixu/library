/**
 * OllamaEmbeddingService Integration Tests
 *
 * Tests the EmbeddingService adapter against a real Ollama instance.
 * Requires Docker containers to be running: docker-compose up -d
 *
 * Run with: npm run test:integration
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { OllamaEmbeddingService } from '../../../../src/infrastructure/driven/embedding/OllamaEmbeddingService.js';
import {
  EmbeddingServiceUnavailableError,
  EmbeddingTextTooLongError,
} from '../../../../src/application/errors/ApplicationErrors.js';

describe('OllamaEmbeddingService Integration', () => {
  let service: OllamaEmbeddingService;

  // Configuration for the Docker Compose Ollama instance
  const OLLAMA_BASE_URL = process.env['OLLAMA_BASE_URL'] ?? 'http://localhost:11434';
  const EMBEDDING_MODEL = 'nomic-embed-text';
  const EMBEDDING_DIMENSIONS = 768;

  beforeAll(async () => {
    service = new OllamaEmbeddingService({
      baseUrl: OLLAMA_BASE_URL,
      model: EMBEDDING_MODEL,
      timeoutMs: 60000, // Give more time for first request (model loading)
    });

    // Verify Ollama is available before running tests
    const isAvailable = await service.isAvailable();
    if (!isAvailable) {
      throw new Error(
        `Ollama is not available at ${OLLAMA_BASE_URL}. ` +
          'Make sure Docker containers are running: docker-compose up -d'
      );
    }
  });

  describe('isAvailable', () => {
    it('should return true when Ollama is running', async () => {
      const result = await service.isAvailable();

      expect(result).toBe(true);
    });

    it('should return false for an invalid URL', async () => {
      const invalidService = new OllamaEmbeddingService({
        baseUrl: 'http://localhost:99999', // Invalid port
        model: EMBEDDING_MODEL,
        timeoutMs: 1000,
      });

      const result = await invalidService.isAvailable();

      expect(result).toBe(false);
    });
  });

  describe('generateEmbedding', () => {
    it('should generate an embedding for a short text', async () => {
      const text = 'Clean Code by Robert C. Martin';

      const result = await service.generateEmbedding(text);

      expect(result.embedding).toBeInstanceOf(Array);
      expect(result.embedding.length).toBe(EMBEDDING_DIMENSIONS);
      expect(result.model).toBe(EMBEDDING_MODEL);
      
      // All values should be numbers
      result.embedding.forEach((value) => {
        expect(typeof value).toBe('number');
        expect(Number.isFinite(value)).toBe(true);
      });
    });

    it('should generate an embedding for a longer text', async () => {
      const text = `
        Clean Code: A Handbook of Agile Software Craftsmanship by Robert C. Martin.
        This book teaches software developers the principles and practices of writing
        clean, maintainable code. It covers topics like meaningful names, functions,
        comments, formatting, objects and data structures, error handling, boundaries,
        unit tests, classes, systems, emergence, and concurrency. The book uses
        examples in Java but the principles apply to any programming language.
        It is considered essential reading for any serious software developer.
      `;

      const result = await service.generateEmbedding(text);

      expect(result.embedding.length).toBe(EMBEDDING_DIMENSIONS);
      expect(result.model).toBe(EMBEDDING_MODEL);
    });

    it('should generate different embeddings for different texts', async () => {
      const text1 = 'Programming in JavaScript';
      const text2 = 'Cooking Italian pasta';

      const result1 = await service.generateEmbedding(text1);
      const result2 = await service.generateEmbedding(text2);

      // Embeddings should be different
      expect(result1.embedding).not.toEqual(result2.embedding);
      
      // Both should have correct dimensions
      expect(result1.embedding.length).toBe(EMBEDDING_DIMENSIONS);
      expect(result2.embedding.length).toBe(EMBEDDING_DIMENSIONS);
    });

    it('should generate similar embeddings for semantically related texts', async () => {
      const text1 = 'JavaScript programming tutorial';
      const text2 = 'Learn to code with JavaScript';

      const result1 = await service.generateEmbedding(text1);
      const result2 = await service.generateEmbedding(text2);

      // Calculate cosine similarity
      const dotProduct = result1.embedding.reduce(
        (sum, val, i) => sum + val * result2.embedding[i],
        0
      );
      const magnitude1 = Math.sqrt(
        result1.embedding.reduce((sum, val) => sum + val * val, 0)
      );
      const magnitude2 = Math.sqrt(
        result2.embedding.reduce((sum, val) => sum + val * val, 0)
      );
      const cosineSimilarity = dotProduct / (magnitude1 * magnitude2);

      // Similar texts should have high cosine similarity (> 0.7)
      expect(cosineSimilarity).toBeGreaterThan(0.7);
    });

    it('should handle whitespace-only text by returning empty or valid embedding', async () => {
      const text = '   ';

      // Trimmed text is empty - Ollama may return empty array or minimal embedding
      // This is model-specific behavior
      const result = await service.generateEmbedding(text);

      // Result should have an embedding array (may be empty for empty input)
      expect(result.embedding).toBeInstanceOf(Array);
      expect(result.model).toBe(EMBEDDING_MODEL);
    });

    it('should handle unicode and special characters', async () => {
      const text = 'Programación en español: ¡Hola, Mundo! 日本語 한국어';

      const result = await service.generateEmbedding(text);

      expect(result.embedding.length).toBe(EMBEDDING_DIMENSIONS);
      expect(result.model).toBe(EMBEDDING_MODEL);
    });

    it('should throw EmbeddingTextTooLongError for text exceeding 7000 characters', async () => {
      const longText = 'a'.repeat(7001);

      await expect(service.generateEmbedding(longText)).rejects.toThrow(
        EmbeddingTextTooLongError
      );
    });

    it('should handle text at a reasonable length', async () => {
      // nomic-embed-text has a context window limit, so we test with a reasonable size
      // that should work reliably (around 2000 chars is safe for most embedding models)
      const reasonableText = 'a'.repeat(2000);

      const result = await service.generateEmbedding(reasonableText);

      expect(result.embedding.length).toBe(EMBEDDING_DIMENSIONS);
    });
  });

  describe('error handling', () => {
    it('should throw EmbeddingServiceUnavailableError for invalid URL', async () => {
      const invalidService = new OllamaEmbeddingService({
        baseUrl: 'http://localhost:99999',
        model: EMBEDDING_MODEL,
        timeoutMs: 1000,
      });

      await expect(invalidService.generateEmbedding('test')).rejects.toThrow(
        EmbeddingServiceUnavailableError
      );
    });

    it('should throw EmbeddingServiceUnavailableError on timeout', async () => {
      const shortTimeoutService = new OllamaEmbeddingService({
        baseUrl: OLLAMA_BASE_URL,
        model: EMBEDDING_MODEL,
        timeoutMs: 1, // 1ms timeout - should fail
      });

      await expect(shortTimeoutService.generateEmbedding('test')).rejects.toThrow(
        EmbeddingServiceUnavailableError
      );
    });
  });
});
