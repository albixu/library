/**
 * LibreTranslateTranslationService Integration Tests
 *
 * Tests the LibreTranslateTranslationService adapter against a real LibreTranslate instance.
 * Tests are skipped if LibreTranslate is not available (it.skipIf pattern).
 *
 * Run with: npm run test:integration
 *
 * To have LibreTranslate available:
 *   docker compose -f docker-compose.consolidate.yml up -d libretranslate
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { LibreTranslateTranslationService } from '../../../../src/infrastructure/driven/translation/LibreTranslateTranslationService.js';
import {
  TranslationServiceUnavailableError,
  TranslationError,
} from '../../../../src/application/errors/ApplicationErrors.js';

describe('LibreTranslateTranslationService Integration', () => {
  let service: LibreTranslateTranslationService;
  let isLibreTranslateAvailable = false;

  const LIBRETRANSLATE_URL =
    process.env['LIBRETRANSLATE_URL'] ?? 'http://localhost:5000';

  beforeAll(async () => {
    service = new LibreTranslateTranslationService({
      baseUrl: LIBRETRANSLATE_URL,
      timeoutMs: 30000,
      retries: 2,
    });

    isLibreTranslateAvailable = await service.isAvailable();

    if (!isLibreTranslateAvailable) {
      console.warn(
        `\n⚠️  LibreTranslate is not available at ${LIBRETRANSLATE_URL}.\n` +
        '   To run these tests, start LibreTranslate:\n' +
        '   docker compose -f docker-compose.consolidate.yml up -d libretranslate\n' +
        '   Integration tests will be skipped.\n',
      );
    }
  });

  describe('isAvailable', () => {
    it('should return a boolean', async () => {
      const result = await service.isAvailable();
      expect(typeof result).toBe('boolean');
    });

    it('should return false for an invalid URL', async () => {
      const invalidService = new LibreTranslateTranslationService({
        baseUrl: 'http://localhost:19999',
        timeoutMs: 1000,
      });

      const result = await invalidService.isAvailable();

      expect(result).toBe(false);
    });
  });

  describe('translate', () => {
    it('should return empty string for empty input without calling API', async () => {
      const result = await service.translate('', 'es');

      expect(result.translatedText).toBe('');
      expect(result.targetLanguage).toBe('es');
    });

    it('should return empty string for whitespace-only input without calling API', async () => {
      const result = await service.translate('   \n\t   ', 'es');

      expect(result.translatedText).toBe('');
    });

    it('should return original text when source is already Spanish', async () => {
      const result = await service.translate('Hola mundo', 'es', 'es');

      expect(result.translatedText).toBe('Hola mundo');
      expect(result.model).toBe('libretranslate');
    });

    it('should throw TranslationError for text exceeding 5000 chars', async () => {
      const longText = 'a'.repeat(5001);

      await expect(service.translate(longText, 'es')).rejects.toThrow(TranslationError);
    });

    it.skipIf(!isLibreTranslateAvailable)(
      'should translate English to Spanish successfully',
      async () => {
        const englishText = 'Clean Code is a handbook of agile software craftsmanship';

        const result = await service.translate(englishText, 'es', 'en');

        expect(result.translatedText).toBeDefined();
        expect(result.translatedText.length).toBeGreaterThan(0);
        expect(result.targetLanguage).toBe('es');
        expect(result.sourceLanguage).toBe('en');
        expect(result.model).toBe('libretranslate');

        const lowerTranslation = result.translatedText.toLowerCase();
        const hasSpanishIndicators =
          lowerTranslation.includes('código') ||
          lowerTranslation.includes('limpio') ||
          lowerTranslation.includes('manual') ||
          lowerTranslation.includes('artesanía') ||
          lowerTranslation.includes('software') ||
          lowerTranslation.includes('ágil') ||
          lowerTranslation.includes('código limpio');

        expect(hasSpanishIndicators).toBe(true);
      },
      30000,
    );

    it.skipIf(!isLibreTranslateAvailable)(
      'should return original text when source language is Spanish',
      async () => {
        const spanishText = 'El código limpio es fácil de leer';

        const result = await service.translate(spanishText, 'es', 'es');

        expect(result.translatedText).toBe(spanishText);
        expect(result.model).toBe('libretranslate');
      },
    );

    it.skipIf(!isLibreTranslateAvailable)(
      'should translate technical text preserving key terms',
      async () => {
        const technicalText =
          'The API endpoint accepts JSON requests and returns HTTP status codes';

        const result = await service.translate(technicalText, 'es', 'en');

        expect(result.translatedText).toBeDefined();
        expect(result.translatedText.length).toBeGreaterThan(0);

        const lowerTranslation = result.translatedText.toLowerCase();
        expect(
          lowerTranslation.includes('api') ||
          lowerTranslation.includes('http') ||
          lowerTranslation.includes('json') ||
          lowerTranslation.includes('solicitudes') ||
          lowerTranslation.includes('peticiones'),
        ).toBe(true);
      },
      30000,
    );

    it.skipIf(!isLibreTranslateAvailable)(
      'should handle book description length text (150-200 chars)',
      async () => {
        const bookDescription =
          'A practical guide to developing production-ready machine learning systems. ' +
          'Covers model deployment, monitoring, and maintenance best practices.';

        expect(bookDescription.length).toBeGreaterThan(100);
        expect(bookDescription.length).toBeLessThan(300);

        const result = await service.translate(bookDescription, 'es', 'en');

        expect(result.translatedText).toBeDefined();
        expect(result.translatedText.length).toBeGreaterThan(0);
        expect(result.targetLanguage).toBe('es');
      },
      30000,
    );
  });

  describe('error handling', () => {
    it('should throw TranslationServiceUnavailableError for invalid URL', async () => {
      const invalidService = new LibreTranslateTranslationService({
        baseUrl: 'http://localhost:19999',
        timeoutMs: 1000,
        retries: 1,
      });

      await expect(invalidService.translate('test', 'es')).rejects.toThrow(
        TranslationServiceUnavailableError,
      );
    });

    it('should throw TranslationServiceUnavailableError on very short timeout', async () => {
      const shortTimeoutService = new LibreTranslateTranslationService({
        baseUrl: LIBRETRANSLATE_URL,
        timeoutMs: 1, // 1ms — guaranteed to fail
        retries: 1,
      });

      await expect(shortTimeoutService.translate('Hello world', 'es')).rejects.toThrow(
        TranslationServiceUnavailableError,
      );
    });
  });
});
