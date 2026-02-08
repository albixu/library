import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OllamaEmbeddingService } from '../../../../../src/infrastructure/driven/embedding/OllamaEmbeddingService.js';
import {
  EmbeddingServiceUnavailableError,
  EmbeddingTextTooLongError,
} from '../../../../../src/application/errors/ApplicationErrors.js';
import type { EmbeddingServiceConfig } from '../../../../../src/application/ports/EmbeddingService.js';

describe('OllamaEmbeddingService', () => {
  let service: OllamaEmbeddingService;
  let originalFetch: typeof global.fetch;
  let mockFetch: ReturnType<typeof vi.fn>;

  const defaultConfig: EmbeddingServiceConfig = {
    baseUrl: 'http://ollama:11434',
    model: 'nomic-embed-text',
    timeoutMs: 30000,
  };

  // Sample embedding vector (768 dimensions as nomic-embed-text produces)
  const mockEmbedding = new Array(768).fill(0).map((_, i) => (i * 0.001) - 0.384);

  beforeEach(() => {
    originalFetch = global.fetch;
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    service = new OllamaEmbeddingService(defaultConfig);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('generateEmbedding', () => {
    it('should generate embedding successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embedding: mockEmbedding }),
      });

      const result = await service.generateEmbedding('Clean Code by Robert C. Martin');

      expect(result.embedding).toEqual(mockEmbedding);
      expect(result.model).toBe('nomic-embed-text');
    });

    it('should call Ollama API with correct parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embedding: mockEmbedding }),
      });

      await service.generateEmbedding('Test text for embedding');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://ollama:11434/api/embeddings',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'nomic-embed-text',
            prompt: 'Test text for embedding',
          }),
        })
      );
    });

    it('should throw EmbeddingTextTooLongError when text exceeds 7000 chars', async () => {
      const longText = 'A'.repeat(7001);

      await expect(service.generateEmbedding(longText)).rejects.toThrow(
        EmbeddingTextTooLongError
      );
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should accept text exactly at 7000 chars limit', async () => {
      const maxText = 'A'.repeat(7000);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embedding: mockEmbedding }),
      });

      const result = await service.generateEmbedding(maxText);

      expect(result.embedding).toEqual(mockEmbedding);
    });

    it('should throw EmbeddingServiceUnavailableError on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      await expect(service.generateEmbedding('Some text')).rejects.toThrow(
        EmbeddingServiceUnavailableError
      );
    });

    it('should throw EmbeddingServiceUnavailableError on timeout', async () => {
      mockFetch.mockRejectedValueOnce(new DOMException('Aborted', 'AbortError'));

      await expect(service.generateEmbedding('Some text')).rejects.toThrow(
        EmbeddingServiceUnavailableError
      );
    });

    it('should throw EmbeddingServiceUnavailableError on non-OK response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(service.generateEmbedding('Some text')).rejects.toThrow(
        EmbeddingServiceUnavailableError
      );
    });

    it('should throw EmbeddingServiceUnavailableError on invalid response format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invalid: 'response' }),
      });

      await expect(service.generateEmbedding('Some text')).rejects.toThrow(
        EmbeddingServiceUnavailableError
      );
    });

    it('should throw EmbeddingServiceUnavailableError when embedding is not an array', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embedding: 'not an array' }),
      });

      await expect(service.generateEmbedding('Some text')).rejects.toThrow(
        EmbeddingServiceUnavailableError
      );
    });

    it('should throw EmbeddingServiceUnavailableError on JSON parsing error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new SyntaxError('Unexpected token < in JSON at position 0');
        },
      });

      await expect(service.generateEmbedding('Some text')).rejects.toThrow(
        EmbeddingServiceUnavailableError
      );
    });

    it('should preserve original error as cause when JSON parsing fails', async () => {
      const originalError = new SyntaxError('Unexpected token < in JSON at position 0');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw originalError;
        },
      });

      try {
        await service.generateEmbedding('Some text');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(EmbeddingServiceUnavailableError);
        expect((error as EmbeddingServiceUnavailableError).cause).toBe(originalError);
      }
    });

    it('should use custom model from config', async () => {
      const customConfig: EmbeddingServiceConfig = {
        baseUrl: 'http://custom:11434',
        model: 'custom-model',
        timeoutMs: 5000,
      };
      const customService = new OllamaEmbeddingService(customConfig);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embedding: mockEmbedding }),
      });

      const result = await customService.generateEmbedding('Test');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://custom:11434/api/embeddings',
        expect.objectContaining({
          body: JSON.stringify({
            model: 'custom-model',
            prompt: 'Test',
          }),
        })
      );
      expect(result.model).toBe('custom-model');
    });

    it('should trim text before processing', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embedding: mockEmbedding }),
      });

      await service.generateEmbedding('  padded text  ');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            model: 'nomic-embed-text',
            prompt: 'padded text',
          }),
        })
      );
    });
  });

  describe('isAvailable', () => {
    it('should return true when service responds', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const result = await service.isAvailable();

      expect(result).toBe(true);
    });

    it('should call Ollama health endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await service.isAvailable();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://ollama:11434/api/tags',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should return false on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      const result = await service.isAvailable();

      expect(result).toBe(false);
    });

    it('should return false on non-OK response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
      });

      const result = await service.isAvailable();

      expect(result).toBe(false);
    });

    it('should return false on timeout', async () => {
      mockFetch.mockRejectedValueOnce(new DOMException('Aborted', 'AbortError'));

      const result = await service.isAvailable();

      expect(result).toBe(false);
    });
  });
});
