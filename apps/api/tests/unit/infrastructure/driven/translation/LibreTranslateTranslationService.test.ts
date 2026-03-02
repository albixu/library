import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LibreTranslateTranslationService } from '../../../../../src/infrastructure/driven/translation/LibreTranslateTranslationService.js';
import {
  TranslationServiceUnavailableError,
  TranslationError,
} from '../../../../../src/application/errors/ApplicationErrors.js';

describe('LibreTranslateTranslationService', () => {
  let service: LibreTranslateTranslationService;
  let originalFetch: typeof global.fetch;
  let mockFetch: ReturnType<typeof vi.fn>;

  const defaultConfig = {
    baseUrl: 'http://libretranslate:5000',
    timeoutMs: 10000,
    retries: 1, // Use 1 retry for faster tests
  };

  beforeEach(() => {
    originalFetch = global.fetch;
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    service = new LibreTranslateTranslationService(defaultConfig);
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
        json: async () => ({ translatedText: 'Código Limpio' }),
      });

      const result = await service.translate('Clean Code', 'es', 'en');

      expect(result.translatedText).toBe('Código Limpio');
      expect(result.targetLanguage).toBe('es');
      expect(result.sourceLanguage).toBe('en');
      expect(result.model).toBe('libretranslate');
    });

    it('should call LibreTranslate API with correct parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ translatedText: 'Hola' }),
      });

      await service.translate('Hello', 'es', 'en');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://libretranslate:5000/translate',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body as string);
      expect(body.q).toBe('Hello');
      expect(body.source).toBe('en');
      expect(body.target).toBe('es');
      expect(body.format).toBe('text');
    });

    it('should default sourceLanguage to "en" when not provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ translatedText: 'Hola' }),
      });

      await service.translate('Hello', 'es');

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body as string);
      expect(body.source).toBe('en');
    });

    it('should return empty string for empty input without calling API', async () => {
      const result = await service.translate('', 'es');

      expect(result.translatedText).toBe('');
      expect(result.targetLanguage).toBe('es');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should return empty string for whitespace-only input without calling API', async () => {
      const result = await service.translate('   ', 'es');

      expect(result.translatedText).toBe('');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should return original text when source language is already the target language', async () => {
      const result = await service.translate('Hola mundo', 'es', 'es');

      expect(result.translatedText).toBe('Hola mundo');
      expect(result.model).toBe('libretranslate');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle case-insensitive language code comparison', async () => {
      const result = await service.translate('Hola', 'es', 'ES');

      expect(result.translatedText).toBe('Hola');
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
        json: async () => ({ translatedText: 'Traducido' }),
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

    it('should throw TranslationServiceUnavailableError on non-OK HTTP response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(service.translate('Hello', 'es')).rejects.toThrow(
        TranslationServiceUnavailableError,
      );
    });

    it('should throw TranslationServiceUnavailableError on 503', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
      });

      await expect(service.translate('Hello', 'es')).rejects.toThrow(
        TranslationServiceUnavailableError,
      );
    });

    it('should throw TranslationError on invalid response format (missing translatedText)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ error: 'Something went wrong' }),
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
        json: async () => ({ translatedText: '  Hola mundo  \n' }),
      });

      const result = await service.translate('Hello world', 'es');

      expect(result.translatedText).toBe('Hola mundo');
    });

    it('should handle special characters in text', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ translatedText: '¿Cómo estás?' }),
      });

      const result = await service.translate("How are you?", 'es', 'en');

      expect(result.translatedText).toBe('¿Cómo estás?');
    });

    it('should strip trailing slash from baseUrl', async () => {
      const serviceWithSlash = new LibreTranslateTranslationService({
        baseUrl: 'http://libretranslate:5000/',
        retries: 1,
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ translatedText: 'Hola' }),
      });

      await serviceWithSlash.translate('Hello', 'es');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://libretranslate:5000/translate',
        expect.any(Object),
      );
    });

    it('should include sourceLanguage in result', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ translatedText: 'Bonjour' }),
      });

      const result = await service.translate('Hello', 'fr', 'en');

      expect(result.sourceLanguage).toBe('en');
      expect(result.targetLanguage).toBe('fr');
    });
  });

  describe('retry behavior', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should retry on transient failures and succeed on third attempt', async () => {
      const retryService = new LibreTranslateTranslationService({
        ...defaultConfig,
        retries: 3,
      });

      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ translatedText: 'Hola' }),
        });

      const [result] = await Promise.all([
        retryService.translate('Hello', 'es'),
        vi.runAllTimersAsync(),
      ]);

      expect(result.translatedText).toBe('Hola');
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should not retry on TranslationError (validation error)', async () => {
      const longText = 'A'.repeat(10001);

      await expect(service.translate(longText, 'es')).rejects.toThrow(TranslationError);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should not retry on TranslationError from invalid response format', async () => {
      const retryService = new LibreTranslateTranslationService({
        ...defaultConfig,
        retries: 3,
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ error: 'Bad input' }),
      });

      await expect(retryService.translate('Hello', 'es')).rejects.toThrow(TranslationError);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should fail after exhausting all retries', async () => {
      const retryService = new LibreTranslateTranslationService({
        ...defaultConfig,
        retries: 3,
      });
      mockFetch.mockRejectedValue(new Error('Persistent error'));

      await expect(
        Promise.all([
          retryService.translate('Hello', 'es'),
          vi.runAllTimersAsync(),
        ]),
      ).rejects.toThrow(TranslationServiceUnavailableError);

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should include retry count in error message', async () => {
      const retryService = new LibreTranslateTranslationService({
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
    it('should return true when service responds with OK', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ([{ code: 'en', name: 'English' }]),
      });

      const result = await service.isAvailable();

      expect(result).toBe(true);
    });

    it('should call LibreTranslate /languages health endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ([]),
      });

      await service.isAvailable();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://libretranslate:5000/languages',
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
      const serviceWithDefaults = new LibreTranslateTranslationService({
        baseUrl: 'http://libretranslate:5000',
      });

      expect(serviceWithDefaults).toBeInstanceOf(LibreTranslateTranslationService);
    });

    it('should use default retries when not specified', async () => {
      vi.useFakeTimers();
      const serviceWithDefaults = new LibreTranslateTranslationService({
        baseUrl: 'http://libretranslate:5000',
      });
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

    it('should return "libretranslate" as model in result', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ translatedText: 'Hola' }),
      });

      const result = await service.translate('Hello', 'es');

      expect(result.model).toBe('libretranslate');
    });
  });
});
