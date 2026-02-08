/**
 * Unit tests for environment configuration module
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadEnvConfig, getOllamaConfig } from '../../../../src/infrastructure/config/env.js';

describe('Environment Configuration', () => {
  // Store original env values
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Clear all relevant env vars before each test
    delete process.env['NODE_ENV'];
    delete process.env['PORT'];
    delete process.env['LOG_LEVEL'];
    delete process.env['DATABASE_URL'];
    delete process.env['OLLAMA_BASE_URL'];
    delete process.env['OLLAMA_MODEL'];
    delete process.env['OLLAMA_TIMEOUT_MS'];
  });

  afterEach(() => {
    // Restore original env after each test
    process.env = { ...originalEnv };
  });

  describe('loadEnvConfig', () => {
    describe('with default values', () => {
      it('should return default configuration when no env vars are set', () => {
        const config = loadEnvConfig();

        expect(config.app.nodeEnv).toBe('development');
        expect(config.app.port).toBe(3000);
        expect(config.app.logLevel).toBe('debug');
        expect(config.database.url).toBe('');
        expect(config.ollama.baseUrl).toBe('http://ollama:11434');
        expect(config.ollama.model).toBe('nomic-embed-text');
        expect(config.ollama.timeoutMs).toBe(30000);
      });
    });

    describe('with valid environment variables', () => {
      it('should use environment variables when provided', () => {
        process.env['NODE_ENV'] = 'production';
        process.env['PORT'] = '8080';
        process.env['LOG_LEVEL'] = 'info';
        process.env['DATABASE_URL'] = 'postgresql://localhost:5432/testdb';
        process.env['OLLAMA_BASE_URL'] = 'http://localhost:11434';
        process.env['OLLAMA_MODEL'] = 'custom-model';
        process.env['OLLAMA_TIMEOUT_MS'] = '60000';

        const config = loadEnvConfig();

        expect(config.app.nodeEnv).toBe('production');
        expect(config.app.port).toBe(8080);
        expect(config.app.logLevel).toBe('info');
        expect(config.database.url).toBe('postgresql://localhost:5432/testdb');
        expect(config.ollama.baseUrl).toBe('http://localhost:11434');
        expect(config.ollama.model).toBe('custom-model');
        expect(config.ollama.timeoutMs).toBe(60000);
      });
    });

    describe('PORT validation', () => {
      it('should throw error when PORT is not a valid number', () => {
        process.env['PORT'] = 'not-a-number';

        expect(() => loadEnvConfig()).toThrow(
          'Configuration error: PORT must be a valid number, got: "not-a-number"'
        );
      });

      it('should throw error when PORT is an empty string', () => {
        process.env['PORT'] = '';

        expect(() => loadEnvConfig()).toThrow(
          'Configuration error: PORT must be a valid number, got: ""'
        );
      });

      it('should accept valid PORT as string', () => {
        process.env['PORT'] = '5000';

        const config = loadEnvConfig();

        expect(config.app.port).toBe(5000);
      });

      it('should accept PORT with leading zeros', () => {
        process.env['PORT'] = '0008080';

        const config = loadEnvConfig();

        expect(config.app.port).toBe(8080);
      });
    });

    describe('OLLAMA_TIMEOUT_MS validation', () => {
      it('should throw error when OLLAMA_TIMEOUT_MS is not a valid number', () => {
        process.env['OLLAMA_TIMEOUT_MS'] = 'invalid';

        expect(() => loadEnvConfig()).toThrow(
          'Configuration error: OLLAMA_TIMEOUT_MS must be a valid number, got: "invalid"'
        );
      });

      it('should throw error when OLLAMA_TIMEOUT_MS is an empty string', () => {
        process.env['OLLAMA_TIMEOUT_MS'] = '';

        expect(() => loadEnvConfig()).toThrow(
          'Configuration error: OLLAMA_TIMEOUT_MS must be a valid number, got: ""'
        );
      });

      it('should accept valid OLLAMA_TIMEOUT_MS as string', () => {
        process.env['OLLAMA_TIMEOUT_MS'] = '45000';

        const config = loadEnvConfig();

        expect(config.ollama.timeoutMs).toBe(45000);
      });
    });

    describe('edge cases', () => {
      it('should handle negative PORT values', () => {
        process.env['PORT'] = '-100';

        const config = loadEnvConfig();

        expect(config.app.port).toBe(-100);
      });

      it('should handle zero as PORT value', () => {
        process.env['PORT'] = '0';

        const config = loadEnvConfig();

        expect(config.app.port).toBe(0);
      });

      it('should handle very large PORT numbers', () => {
        process.env['PORT'] = '999999';

        const config = loadEnvConfig();

        expect(config.app.port).toBe(999999);
      });

      it('should handle floating point PORT by truncating', () => {
        process.env['PORT'] = '3000.75';

        const config = loadEnvConfig();

        expect(config.app.port).toBe(3000);
      });
    });
  });

  describe('getOllamaConfig', () => {
    it('should return only Ollama configuration', () => {
      process.env['OLLAMA_BASE_URL'] = 'http://test:11434';
      process.env['OLLAMA_MODEL'] = 'test-model';
      process.env['OLLAMA_TIMEOUT_MS'] = '20000';

      const config = getOllamaConfig();

      expect(config).toEqual({
        baseUrl: 'http://test:11434',
        model: 'test-model',
        timeoutMs: 20000,
      });
    });

    it('should return default Ollama configuration when no env vars set', () => {
      const config = getOllamaConfig();

      expect(config).toEqual({
        baseUrl: 'http://ollama:11434',
        model: 'nomic-embed-text',
        timeoutMs: 30000,
      });
    });

    it('should throw error if OLLAMA_TIMEOUT_MS is invalid', () => {
      process.env['OLLAMA_TIMEOUT_MS'] = 'bad-value';

      expect(() => getOllamaConfig()).toThrow(
        'Configuration error: OLLAMA_TIMEOUT_MS must be a valid number'
      );
    });
  });
});
