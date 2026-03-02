import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OllamaTranslationService } from '../../../../../src/infrastructure/driven/translation/OllamaTranslationService.js';
import {
  TranslationServiceUnavailableError,
  TranslationError,
} from '../../../../../src/application/errors/ApplicationErrors.js';
import type { TranslationServiceConfig } from '../../../../../src/application/ports/TranslationService.js';

describe('OllamaTranslationService', () => {
  let service: OllamaTranslationService;
  let originalFetch: typeof global.fetch;
  let mockFetch: ReturnType<typeof vi.fn>;

  const defaultConfig: TranslationServiceConfig = {
    baseUrl: 'http://ollama:11434',
    model: 'llama3.2:1b',
    timeoutMs: 60000,
    retries: 1, // Use 1 retry for faster tests
  };

  beforeEach(() => {
    originalFetch = global.fetch;
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    service = new OllamaTranslationService(defaultConfig);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('translate', () => {
    it('should translate text successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: 'Código Limpio', done: true }),
      });

      const result = await service.translate('Clean Code', 'es');

      expect(result.translatedText).toBe('Código Limpio');
      expect(result.targetLanguage).toBe('es');
      expect(result.model).toBe('llama3.2:1b');
    });

    it('should call Ollama API with correct parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: 'Hola', done: true }),
      });

      await service.translate('Hello', 'es');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://ollama:11434/api/generate',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body as string);
      expect(body.model).toBe('llama3.2:1b');
      expect(body.stream).toBe(false);
      expect(body.options.temperature).toBe(0.3);
      expect(body.options.top_p).toBe(0.9);
      expect(body.prompt).toContain('Hello');
      expect(body.prompt).toContain('Spanish');
    });

    it('should return empty string for empty input', async () => {
      const result = await service.translate('', 'es');

      expect(result.translatedText).toBe('');
      expect(result.targetLanguage).toBe('es');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should return empty string for whitespace-only input', async () => {
      const result = await service.translate('   ', 'es');

      expect(result.translatedText).toBe('');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should throw TranslationError when text exceeds 10000 chars', async () => {
      const longText = 'A'.repeat(10001);

      await expect(service.translate(longText, 'es')).rejects.toThrow(TranslationError);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should accept text exactly at 10000 chars limit', async () => {
      const maxText = 'A'.repeat(10000);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: 'Traducido', done: true }),
      });

      const result = await service.translate(maxText, 'es');

      expect(result.translatedText).toBe('Traducido');
    });

    it('should throw TranslationServiceUnavailableError on network error', async () => {
      mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(service.translate('Hello', 'es')).rejects.toThrow(
        TranslationServiceUnavailableError,
      );
    });

    it('should throw TranslationServiceUnavailableError on timeout', async () => {
      mockFetch.mockRejectedValue(new DOMException('Aborted', 'AbortError'));

      await expect(service.translate('Hello', 'es')).rejects.toThrow(
        TranslationServiceUnavailableError,
      );
    });

    it('should throw TranslationServiceUnavailableError on non-OK response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(service.translate('Hello', 'es')).rejects.toThrow(
        TranslationServiceUnavailableError,
      );
    });

    it('should throw TranslationError on invalid response format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invalid: 'response' }),
      });

      await expect(service.translate('Hello', 'es')).rejects.toThrow(TranslationError);
    });

    it('should throw TranslationServiceUnavailableError on JSON parsing error', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => {
          throw new SyntaxError('Unexpected token < in JSON at position 0');
        },
      });

      await expect(service.translate('Hello', 'es')).rejects.toThrow(
        TranslationServiceUnavailableError,
      );
    });

    it('should trim translated text', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: '  Hola mundo  \n', done: true }),
      });

      const result = await service.translate('Hello world', 'es');

      expect(result.translatedText).toBe('Hola mundo');
    });

    it('should use different target languages in prompt', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: 'Bonjour', done: true }),
      });

      await service.translate('Hello', 'fr');

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body as string);
      expect(body.prompt).toContain('French');
    });

    it('should handle special characters in text', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: '¿Cómo estás?', done: true }),
      });

      const result = await service.translate("How are you?", 'es');

      expect(result.translatedText).toBe('¿Cómo estás?');
    });

    it('should preserve formatting in translated text', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: 'Primera línea\nSegunda línea',
          done: true,
        }),
      });

      const result = await service.translate('First line\nSecond line', 'es');

      expect(result.translatedText).toBe('Primera línea\nSegunda línea');
    });
  });

  describe('retry behavior', () => {
    beforeEach(() => {
      // Use fake timers so exponential backoff delays (1s, 2s, 4s…) don't slow tests down
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should retry on transient failures', async () => {
      // Fail twice, succeed on third
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ response: 'Hola', done: true }),
        });

      const retryService = new OllamaTranslationService({
        ...defaultConfig,
        retries: 3,
      });

      // Run translation and advance timers concurrently to avoid unhandled rejections
      const [result] = await Promise.all([
        retryService.translate('Hello', 'es'),
        vi.runAllTimersAsync(),
      ]);

      expect(result.translatedText).toBe('Hola');
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should not retry on TranslationError (validation error)', async () => {
      const longText = 'A'.repeat(5001);

      await expect(service.translate(longText, 'es')).rejects.toThrow(TranslationError);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should fail after exhausting all retries', async () => {
      const retryService = new OllamaTranslationService({
        ...defaultConfig,
        retries: 3,
      });
      mockFetch.mockRejectedValue(new Error('Persistent error'));

      // Run the translation and advance all timers concurrently to avoid unhandled rejections
      await expect(
        Promise.all([
          retryService.translate('Hello', 'es'),
          vi.runAllTimersAsync(),
        ]),
      ).rejects.toThrow(TranslationServiceUnavailableError);

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should include retry count in error message', async () => {
      const retryService = new OllamaTranslationService({
        ...defaultConfig,
        retries: 3,
      });
      mockFetch.mockRejectedValue(new Error('Persistent error'));

      let errorMessage = '';
      try {
        await Promise.all([
          retryService.translate('Hello', 'es'),
          vi.runAllTimersAsync(),
        ]);
      } catch (error) {
        if (error instanceof TranslationServiceUnavailableError) {
          errorMessage = error.message;
        }
      }

      expect(errorMessage).toContain('3 attempts');
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
        }),
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

  describe('configuration', () => {
    it('should use default timeout when not specified', () => {
      const configWithoutTimeout: TranslationServiceConfig = {
        baseUrl: 'http://ollama:11434',
        model: 'llama3.2:1b',
      };
      const serviceWithDefaults = new OllamaTranslationService(configWithoutTimeout);

      // Service should be created without error
      expect(serviceWithDefaults).toBeInstanceOf(OllamaTranslationService);
    });

    it('should use default retries when not specified', async () => {
      vi.useFakeTimers();
      const configWithoutRetries: TranslationServiceConfig = {
        baseUrl: 'http://ollama:11434',
        model: 'llama3.2:1b',
      };
      const serviceWithDefaults = new OllamaTranslationService(configWithoutRetries);
      mockFetch.mockRejectedValue(new Error('Error'));

      await expect(
        Promise.all([
          serviceWithDefaults.translate('Hello', 'es'),
          vi.runAllTimersAsync(),
        ]),
      ).rejects.toThrow();

      // Default is 3 retries
      expect(mockFetch).toHaveBeenCalledTimes(3);
      vi.useRealTimers();
    });

    it('should use custom model from config', async () => {
      const customConfig: TranslationServiceConfig = {
        baseUrl: 'http://custom:11434',
        model: 'custom-model',
      };
      const customService = new OllamaTranslationService(customConfig);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: 'Hola', done: true }),
      });

      const result = await customService.translate('Hello', 'es');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://custom:11434/api/generate',
        expect.any(Object),
      );
      expect(result.model).toBe('custom-model');
    });
  });
});
