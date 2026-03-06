import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OllamaEmbeddingService } from '../../../../../src/infrastructure/driven/embedding/OllamaEmbeddingService.js';
import { EmbeddingServiceUnavailableError } from '../../../../../src/application/errors/ApplicationErrors.js';
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

  // Sample embedding vector (768 dimensions as nomic-embed-text produces), L2-normalized
  const rawEmbedding = new Array(768).fill(0).map((_, i) => (i * 0.001) - 0.384);
  const norm = Math.sqrt(rawEmbedding.reduce((sum, v) => sum + v * v, 0));
  const mockEmbedding = rawEmbedding.map(v => v / norm);

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
    it('should generate embedding successfully for short text', async () => {
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

    it('should process text longer than CHUNK_SIZE by splitting into chunks', async () => {
      // Text longer than 6500 chars (CHUNK_SIZE)
      const longText = 'A'.repeat(7000);

      // Two chunks expected → two fetch calls
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ embedding: mockEmbedding }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ embedding: mockEmbedding }) });

      const result = await service.generateEmbedding(longText);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.embedding).toHaveLength(768);
      expect(result.model).toBe('nomic-embed-text');
    });

    it('should return a normalized (L2) vector when multiple chunks are averaged', async () => {
      const longText = 'A'.repeat(7000);
      const embeddingA = new Array(768).fill(0).map((_, i) => i * 0.001);
      const embeddingB = new Array(768).fill(0).map((_, i) => i * 0.002);

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ embedding: embeddingA }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ embedding: embeddingB }) });

      const result = await service.generateEmbedding(longText);

      // L2 norm of the result should be ~1
      const resultNorm = Math.sqrt(result.embedding.reduce((sum, v) => sum + v * v, 0));
      expect(resultNorm).toBeCloseTo(1, 5);
    });

    it('should use a single chunk (no averaging) for text at or below CHUNK_SIZE', async () => {
      const exactText = 'B'.repeat(6500);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embedding: mockEmbedding }),
      });

      const result = await service.generateEmbedding(exactText);

      // Only one fetch call — no chunking needed
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result.embedding).toEqual(mockEmbedding);
    });

    it('should handle very long text requiring more than 2 chunks', async () => {
      // 6500 chunk, 200 overlap → step = 6300. Need 3 chunks for ~13000 chars
      const veryLongText = 'C'.repeat(13000);

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ embedding: mockEmbedding }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ embedding: mockEmbedding }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ embedding: mockEmbedding }) });

      const result = await service.generateEmbedding(veryLongText);

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(result.embedding).toHaveLength(768);
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

      let caughtError: unknown;
      try {
        await service.generateEmbedding('Some text');
      } catch (error) {
        caughtError = error;
      }

      expect(caughtError).toBeDefined();
      expect(caughtError).toBeInstanceOf(EmbeddingServiceUnavailableError);
      expect((caughtError as EmbeddingServiceUnavailableError).cause).toBe(originalError);
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

  describe('splitIntoChunks', () => {
    it('should return single chunk when text fits within chunkSize', () => {
      const text = 'Hello world';
      // Access private method via type cast for unit testing
      const chunks = (service as unknown as { splitIntoChunks: (t: string, s: number, o: number) => string[] })
        .splitIntoChunks(text, 6500, 200);

      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toBe(text);
    });

    it('should return single chunk when text equals chunkSize exactly', () => {
      const text = 'A'.repeat(6500);
      const chunks = (service as unknown as { splitIntoChunks: (t: string, s: number, o: number) => string[] })
        .splitIntoChunks(text, 6500, 200);

      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toBe(text);
    });

    it('should split text into 2 chunks when text is slightly longer than chunkSize', () => {
      const text = 'A'.repeat(7000);
      const chunks = (service as unknown as { splitIntoChunks: (t: string, s: number, o: number) => string[] })
        .splitIntoChunks(text, 6500, 200);

      expect(chunks).toHaveLength(2);
      expect(chunks[0]).toHaveLength(6500);
      // Second chunk starts at offset 6300 (6500 - 200 overlap)
      expect(chunks[1]).toHaveLength(700); // 7000 - 6300 = 700
    });

    it('should produce chunks that overlap by the specified amount', () => {
      const text = 'ABCDEFGHIJ'.repeat(1000); // 10000 chars
      const chunkSize = 6500;
      const overlap = 200;
      const chunks = (service as unknown as { splitIntoChunks: (t: string, s: number, o: number) => string[] })
        .splitIntoChunks(text, chunkSize, overlap);

      // The end of chunk[0] and the start of chunk[1] should share `overlap` chars
      const endOfFirst = chunks[0]!.slice(-overlap);
      const startOfSecond = chunks[1]!.slice(0, overlap);
      expect(endOfFirst).toBe(startOfSecond);
    });

    it('should cover the entire text across all chunks (no gaps)', () => {
      const text = 'X'.repeat(20000);
      const chunkSize = 6500;
      const overlap = 200;
      const chunks = (service as unknown as { splitIntoChunks: (t: string, s: number, o: number) => string[] })
        .splitIntoChunks(text, chunkSize, overlap);

      // Last chunk must end at the end of the text
      expect(chunks[chunks.length - 1]).toBe(text.slice((chunks.length - 1) * (chunkSize - overlap)));
      // First char of first chunk is the first char of the text
      expect(chunks[0]![0]).toBe('X');
      // Last char of last chunk is the last char of the text
      expect(chunks[chunks.length - 1]!.slice(-1)).toBe('X');
    });

    it('should handle 3 chunks for ~13000 char text with 6500/200 settings', () => {
      const text = 'Y'.repeat(13000);
      const chunks = (service as unknown as { splitIntoChunks: (t: string, s: number, o: number) => string[] })
        .splitIntoChunks(text, 6500, 200);

      // step = 6500 - 200 = 6300
      // chunk 0: [0, 6500)
      // chunk 1: [6300, 12800)
      // chunk 2: [12600, 13000) — last chunk is shorter
      expect(chunks).toHaveLength(3);
      expect(chunks[0]).toHaveLength(6500);
      expect(chunks[1]).toHaveLength(6500);
      expect(chunks[2]).toHaveLength(13000 - 2 * 6300); // 400
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
