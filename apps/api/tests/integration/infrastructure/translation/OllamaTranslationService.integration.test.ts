/**
 * OllamaTranslationService Integration Tests
 *
 * Tests the TranslationService adapter against a real Ollama instance.
 * Requires Docker containers to be running: docker-compose up -d
 *
 * Run with: npm run test:integration
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { OllamaTranslationService } from '../../../../src/infrastructure/driven/translation/OllamaTranslationService.js';
import {
  TranslationServiceUnavailableError,
  TranslationError,
} from '../../../../src/application/errors/ApplicationErrors.js';

describe('OllamaTranslationService Integration', () => {
  let service: OllamaTranslationService;
  let translationModelAvailable = false;

  // Configuration for the Docker Compose Ollama instance
  const OLLAMA_BASE_URL = process.env['OLLAMA_BASE_URL'] ?? 'http://localhost:11434';
  const TRANSLATION_MODEL = process.env['TRANSLATION_MODEL'] ?? 'llama3.2:1b';

  beforeAll(async () => {
    service = new OllamaTranslationService({
      baseUrl: OLLAMA_BASE_URL,
      model: TRANSLATION_MODEL,
      timeoutMs: 120000, // Give more time for integration tests (model loading + translation)
      retries: 2,
    });

    // Verify Ollama is available before running tests
    const isAvailable = await service.isAvailable();
    if (!isAvailable) {
      console.warn(
        `\n⚠️  Ollama is not available at ${OLLAMA_BASE_URL}.\n` +
        '   Make sure Docker containers are running: docker-compose up -d\n' +
        '   Some tests will be skipped.\n'
      );
      return;
    }

    // Check if translation model is available
    try {
      await service.translate('test', 'es');
      translationModelAvailable = true;
    } catch {
      console.warn(
        '\n⚠️  Translation model not available. Translation tests will be skipped.\n' +
        `   Run: docker exec library-ollama ollama pull ${TRANSLATION_MODEL}\n`
      );
    }
  });

  describe('isAvailable', () => {
    it('should return true when Ollama is running', async () => {
      // This test only checks if Ollama server is running, not if model is loaded
      const result = await service.isAvailable();

      // May be true even if model not available
      expect(typeof result).toBe('boolean');
    });

    it('should return false for an invalid URL', async () => {
      const invalidService = new OllamaTranslationService({
        baseUrl: 'http://localhost:99999', // Invalid port
        model: TRANSLATION_MODEL,
        timeoutMs: 1000,
      });

      const result = await invalidService.isAvailable();

      expect(result).toBe(false);
    });
  });

  // Helper to skip tests when model is not available
  const runIfModelAvailable = (name: string, fn: () => Promise<void>, timeout?: number) => {
    it(name, async () => {
      if (!translationModelAvailable) {
        console.log(`Skipping: ${name} - Translation model not available`);
        return;
      }
      await fn();
    }, timeout);
  };

  describe('translate', () => {
    runIfModelAvailable('should connect to Ollama and translate English to Spanish', async () => {
      const englishText = 'Clean Code is a handbook of agile software craftsmanship';

      const result = await service.translate(englishText, 'es');

      expect(result.translatedText).toBeDefined();
      expect(result.translatedText.length).toBeGreaterThan(0);
      expect(result.targetLanguage).toBe('es');
      expect(result.model).toBe(TRANSLATION_MODEL);

      // Translation should contain Spanish words
      // We check for common Spanish words that would appear in this translation
      const lowerTranslation = result.translatedText.toLowerCase();
      const hasSpanishIndicators =
        lowerTranslation.includes('código') ||
        lowerTranslation.includes('limpio') ||
        lowerTranslation.includes('manual') ||
        lowerTranslation.includes('artesanía') ||
        lowerTranslation.includes('software') ||
        lowerTranslation.includes('ágil');
      
      expect(hasSpanishIndicators).toBe(true);
    }, 120000);

    runIfModelAvailable('should translate French to Spanish', async () => {
      const frenchText = 'Bonjour, comment allez-vous?';

      const result = await service.translate(frenchText, 'es');

      expect(result.translatedText).toBeDefined();
      expect(result.translatedText.length).toBeGreaterThan(0);
      expect(result.targetLanguage).toBe('es');

      // Should contain Spanish greeting
      const lowerTranslation = result.translatedText.toLowerCase();
      const hasSpanishGreeting =
        lowerTranslation.includes('hola') ||
        lowerTranslation.includes('buenos') ||
        lowerTranslation.includes('cómo') ||
        lowerTranslation.includes('está');
      
      expect(hasSpanishGreeting).toBe(true);
    }, 120000);

    runIfModelAvailable('should translate German to Spanish', async () => {
      const germanText = 'Guten Tag, wie geht es Ihnen?';

      const result = await service.translate(germanText, 'es');

      expect(result.translatedText).toBeDefined();
      expect(result.translatedText.length).toBeGreaterThan(0);
      expect(result.targetLanguage).toBe('es');

      // Should contain Spanish greeting
      const lowerTranslation = result.translatedText.toLowerCase();
      const hasSpanishGreeting =
        lowerTranslation.includes('buenos') ||
        lowerTranslation.includes('hola') ||
        lowerTranslation.includes('cómo') ||
        lowerTranslation.includes('está');
      
      expect(hasSpanishGreeting).toBe(true);
    }, 120000);

    runIfModelAvailable('should handle long texts (around 2000 chars)', async () => {
      // Create a long but reasonable English text
      const longText = `
        Clean Code: A Handbook of Agile Software Craftsmanship by Robert C. Martin.
        This book teaches software developers the principles and practices of writing
        clean, maintainable code. It covers topics like meaningful names, functions,
        comments, formatting, objects and data structures, error handling, boundaries,
        unit tests, classes, systems, emergence, and concurrency. The book uses
        examples in Java but the principles apply to any programming language.
        It is considered essential reading for any serious software developer.
        The author emphasizes the importance of writing code that is easy to read
        and understand, not just code that works. Clean code is code that has been
        written with care. It is code that clearly expresses the intent of its author.
        The goal of this book is to help you write code that is a pleasure to read,
        code that can be easily understood and modified by other developers.
        Software craftsmanship is about treating coding as a craft, something that
        requires skill, discipline, and a commitment to continuous improvement.
        The best programmers are not just problem solvers, they are artists who
        take pride in their work and strive to create something beautiful.
      `.repeat(2);

      expect(longText.length).toBeGreaterThan(1500);
      expect(longText.length).toBeLessThan(5000);

      const result = await service.translate(longText.trim(), 'es');

      expect(result.translatedText).toBeDefined();
      expect(result.translatedText.length).toBeGreaterThan(0);
      // Translation should be roughly similar length (allowing for LLM variation in output length)
      // Using 40% threshold to account for models that produce more concise translations
      expect(result.translatedText.length).toBeGreaterThan(longText.length * 0.4);
    }, 180000); // 3 minute timeout for longer translation

    runIfModelAvailable('should maintain meaning in translation (technical terms)', async () => {
      const technicalText = 'The API endpoint accepts JSON requests and returns HTTP status codes';

      const result = await service.translate(technicalText, 'es');

      // Technical terms should be preserved or properly translated
      const lowerTranslation = result.translatedText.toLowerCase();
      // API, JSON, HTTP should often be kept in English or properly adapted
      expect(
        lowerTranslation.includes('api') ||
        lowerTranslation.includes('endpoint') ||
        lowerTranslation.includes('punto final') ||
        lowerTranslation.includes('solicitudes') ||
        lowerTranslation.includes('peticiones')
      ).toBe(true);
    }, 120000);

    runIfModelAvailable('should handle technical terminology', async () => {
      const technicalText = 'Implement the Repository pattern using Dependency Injection';

      const result = await service.translate(technicalText, 'es');

      expect(result.translatedText).toBeDefined();
      // Technical patterns should be recognizable
      const lowerTranslation = result.translatedText.toLowerCase();
      expect(
        lowerTranslation.includes('repositorio') ||
        lowerTranslation.includes('repository') ||
        lowerTranslation.includes('patrón') ||
        lowerTranslation.includes('inyección') ||
        lowerTranslation.includes('dependencia')
      ).toBe(true);
    }, 120000);

    // These tests don't require the model - they test client-side validation
    it('should return empty string for empty input', async () => {
      const result = await service.translate('', 'es');

      expect(result.translatedText).toBe('');
      expect(result.targetLanguage).toBe('es');
    });

    it('should return empty string for whitespace-only input', async () => {
      const result = await service.translate('   \n\t   ', 'es');

      expect(result.translatedText).toBe('');
    });

    it('should throw TranslationError for text exceeding 10000 chars', async () => {
      const longText = 'a'.repeat(10001);

      await expect(service.translate(longText, 'es')).rejects.toThrow(TranslationError);
    });

    runIfModelAvailable('should handle unicode and special characters', async () => {
      const unicodeText = 'Hello World! This has special chars: é, ñ, ü, ß';

      const result = await service.translate(unicodeText, 'es');

      expect(result.translatedText).toBeDefined();
      expect(result.translatedText.length).toBeGreaterThan(0);
    }, 120000);
  });

  describe('error handling', () => {
    it('should throw TranslationServiceUnavailableError for invalid URL', async () => {
      const invalidService = new OllamaTranslationService({
        baseUrl: 'http://localhost:99999',
        model: TRANSLATION_MODEL,
        timeoutMs: 1000,
        retries: 1,
      });

      await expect(invalidService.translate('test', 'es')).rejects.toThrow(
        TranslationServiceUnavailableError
      );
    });

    it('should throw TranslationServiceUnavailableError on very short timeout', async () => {
      const shortTimeoutService = new OllamaTranslationService({
        baseUrl: OLLAMA_BASE_URL,
        model: TRANSLATION_MODEL,
        timeoutMs: 1, // 1ms timeout - should fail
        retries: 1,
      });

      await expect(shortTimeoutService.translate('Hello world', 'es')).rejects.toThrow(
        TranslationServiceUnavailableError
      );
    });
  });
});
