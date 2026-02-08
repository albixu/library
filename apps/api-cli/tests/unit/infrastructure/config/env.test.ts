/**
 * Unit tests for environment configuration module
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadEnvConfig, getOllamaConfig } from '../../../../src/infrastructure/config/env.js';

describe('Environment Configuration', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('loadEnvConfig', () => {
    it('should load configuration with all environment variables set', () => {
      process.env['NODE_ENV'] = 'test';
      process.env['PORT'] = '4000';
      process.env['LOG_LEVEL'] = 'info';
      process.env['DATABASE_URL'] = 'postgresql://test:test@localhost:5432/testdb';
      process.env['OLLAMA_BASE_URL'] = 'http://localhost:11434';
      process.env['OLLAMA_MODEL'] = 'test-model';
      process.env['OLLAMA_TIMEOUT_MS'] = '15000';

      const config = loadEnvConfig();

      expect(config.app.nodeEnv).toBe('test');
      expect(config.app.port).toBe(4000);
      expect(config.app.logLevel).toBe('info');
      expect(config.database.url).toBe('postgresql://test:test@localhost:5432/testdb');
      expect(config.ollama.baseUrl).toBe('http://localhost:11434');
      expect(config.ollama.model).toBe('test-model');
      expect(config.ollama.timeoutMs).toBe(15000);
    });

    it('should use default values when optional environment variables are not set', () => {
      process.env['DATABASE_URL'] = 'postgresql://test:test@localhost:5432/testdb';
      // Clear optional environment variables
      delete process.env['NODE_ENV'];
      delete process.env['PORT'];
      delete process.env['LOG_LEVEL'];
      delete process.env['OLLAMA_BASE_URL'];
      delete process.env['OLLAMA_MODEL'];
      delete process.env['OLLAMA_TIMEOUT_MS'];

      const config = loadEnvConfig();

      expect(config.app.nodeEnv).toBe('development');
      expect(config.app.port).toBe(3000);
      expect(config.app.logLevel).toBe('debug');
      expect(config.database.url).toBe('postgresql://test:test@localhost:5432/testdb');
      expect(config.ollama.baseUrl).toBe('http://ollama:11434');
      expect(config.ollama.model).toBe('nomic-embed-text');
      expect(config.ollama.timeoutMs).toBe(30000);
    });

    it('should throw error when DATABASE_URL is not set', () => {
      delete process.env['DATABASE_URL'];

      expect(() => loadEnvConfig()).toThrow(
        'DATABASE_URL environment variable is required but not set'
      );
    });

    it('should throw error when DATABASE_URL is empty string', () => {
      process.env['DATABASE_URL'] = '';

      expect(() => loadEnvConfig()).toThrow(
        'DATABASE_URL environment variable is required but not set'
      );
    });

    it('should throw error when DATABASE_URL is only whitespace', () => {
      process.env['DATABASE_URL'] = '   ';

      expect(() => loadEnvConfig()).toThrow(
        'DATABASE_URL environment variable is required but not set'
      );
    });

    it('should include helpful error message with example connection string', () => {
      delete process.env['DATABASE_URL'];

      expect(() => loadEnvConfig()).toThrow(
        /Please set it in your environment or \.env file \(e\.g\., postgresql:\/\/user:password@host:5432\/database\)/
      );
    });
  });

  describe('getOllamaConfig', () => {
    it('should return Ollama configuration when DATABASE_URL is set', () => {
      process.env['DATABASE_URL'] = 'postgresql://test:test@localhost:5432/testdb';
      process.env['OLLAMA_BASE_URL'] = 'http://custom:11434';
      process.env['OLLAMA_MODEL'] = 'custom-model';
      process.env['OLLAMA_TIMEOUT_MS'] = '20000';

      const config = getOllamaConfig();

      expect(config).toEqual({
        baseUrl: 'http://custom:11434',
        model: 'custom-model',
        timeoutMs: 20000,
      });
    });

    it('should return default Ollama configuration when no env vars set', () => {
      process.env['DATABASE_URL'] = 'postgresql://test:test@localhost:5432/testdb';

      const config = getOllamaConfig();

      expect(config).toEqual({
        baseUrl: 'http://ollama:11434',
        model: 'nomic-embed-text',
        timeoutMs: 30000,
      });
    });

    it('should throw error if OLLAMA_TIMEOUT_MS is invalid', () => {
      process.env['DATABASE_URL'] = 'postgresql://test:test@localhost:5432/testdb';
      process.env['OLLAMA_TIMEOUT_MS'] = 'bad-value';

      expect(() => getOllamaConfig()).toThrow(
        'Invalid integer value for OLLAMA_TIMEOUT_MS: "bad-value". Expected a valid number.'
      );
    });

    it('should throw error if OLLAMA_TIMEOUT_MS contains partial number with trailing text', () => {
      process.env['DATABASE_URL'] = 'postgresql://test:test@localhost:5432/testdb';
      process.env['OLLAMA_TIMEOUT_MS'] = '15000ms';

      expect(() => loadEnvConfig()).toThrow(
        'Invalid integer value for OLLAMA_TIMEOUT_MS: "15000ms". Expected a valid number.'
      );
    });

    it('should throw error if PORT contains partial number with trailing text', () => {
      process.env['DATABASE_URL'] = 'postgresql://test:test@localhost:5432/testdb';
      process.env['PORT'] = '3000px';

      expect(() => loadEnvConfig()).toThrow(
        'Invalid integer value for PORT: "3000px". Expected a valid number.'
      );
    });

    it('should throw error if PORT contains leading text', () => {
      process.env['DATABASE_URL'] = 'postgresql://test:test@localhost:5432/testdb';
      process.env['PORT'] = 'port3000';

      expect(() => loadEnvConfig()).toThrow(
        'Invalid integer value for PORT: "port3000". Expected a valid number.'
      );
    });

    it('should throw error if integer value contains decimal', () => {
      process.env['DATABASE_URL'] = 'postgresql://test:test@localhost:5432/testdb';
      process.env['PORT'] = '3000.5';

      expect(() => loadEnvConfig()).toThrow(
        'Invalid integer value for PORT: "3000.5". Expected a valid number.'
      );
    });
  });
});
