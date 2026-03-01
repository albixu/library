/**
 * Environment Configuration Module
 *
 * Centralizes environment variable access with type safety and defaults.
 * Uses process.env directly - for production, consider using a validation
 * library like Zod for stricter type checking.
 */

/**
 * Ollama embedding service configuration
 */
export interface OllamaConfig {
  /** Base URL of the Ollama service */
  baseUrl: string;
  /** Model to use for embeddings */
  model: string;
  /** Request timeout in milliseconds */
  timeoutMs: number;
}

/**
 * Translation service configuration (HU-013)
 */
export interface TranslationConfig {
  /** Base URL of the translation service (Ollama) */
  baseUrl: string;
  /** Model to use for translation */
  model: string;
  /** Request timeout in milliseconds */
  timeoutMs: number;
  /** Number of retry attempts */
  retries: number;
}

/**
 * Database configuration
 */
export interface DatabaseConfig {
  /** PostgreSQL connection URL */
  url: string;
}

/**
 * Application configuration
 */
export interface AppConfig {
  /** Node environment (development, production, test) */
  nodeEnv: string;
  /** HTTP server port */
  port: number;
  /** Log level */
  logLevel: string;
}

/**
 * Complete environment configuration
 */
export interface EnvConfig {
  app: AppConfig;
  database: DatabaseConfig;
  ollama: OllamaConfig;
  translation: TranslationConfig; // HU-013
}

/**
 * Default configuration values
 */
const DEFAULTS = {
  NODE_ENV: 'development',
  PORT: 3000,
  LOG_LEVEL: 'debug',
  OLLAMA_EMBEDDING_URL: 'http://ollama-embeddings:11434',
  OLLAMA_MODEL: 'nomic-embed-text',
  OLLAMA_TIMEOUT_MS: 30000,
  // HU-013 & HU-021: Translation service defaults
  OLLAMA_TRANSLATION_URL: 'http://ollama-translations:11435',
  TRANSLATION_MODEL: 'aya-expanse:8b',
  TRANSLATION_TIMEOUT_MS: 60000,
  TRANSLATION_RETRIES: 3,
} as const;

/**
 * Safely parses an integer from a string with fallback
 * Uses strict validation to reject partial numbers (e.g., "15000ms" -> error)
 */
function safeParseInt(value: string | undefined, defaultValue: number, fieldName: string): number {
  if (value === undefined || value.trim() === '') {
    return defaultValue;
  }
  const trimmed = value.trim();
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed)) {
    throw new Error(
      `Invalid integer value for ${fieldName}: "${value}". Expected a valid number.`,
    );
  }
  return parsed;
}

/**
 * Loads environment configuration with defaults
 *
 * @returns Complete environment configuration object
 */
export function loadEnvConfig(): EnvConfig {
  // Validate required environment variables
  const databaseUrl = process.env['DATABASE_URL'];
  if (!databaseUrl || databaseUrl.trim() === '') {
    throw new Error(
      'DATABASE_URL environment variable is required but not set. ' +
      'Please set it in your environment or .env file (e.g., postgresql://user:password@host:5432/database)',
    );
  }

  return {
    app: {
      nodeEnv: process.env['NODE_ENV'] ?? DEFAULTS.NODE_ENV,
      port: safeParseInt(process.env['PORT'], DEFAULTS.PORT, 'PORT'),
      logLevel: process.env['LOG_LEVEL'] ?? DEFAULTS.LOG_LEVEL,
    },
    database: {
      url: databaseUrl,
    },
    ollama: {
      baseUrl: process.env['OLLAMA_EMBEDDING_URL'] ?? DEFAULTS.OLLAMA_EMBEDDING_URL,
      model: process.env['OLLAMA_MODEL'] ?? DEFAULTS.OLLAMA_MODEL,
      timeoutMs: safeParseInt(
        process.env['OLLAMA_TIMEOUT_MS'],
        DEFAULTS.OLLAMA_TIMEOUT_MS,
        'OLLAMA_TIMEOUT_MS',
      ),
    },
    // HU-013: Translation service configuration
    translation: {
      baseUrl: process.env['OLLAMA_TRANSLATION_URL'] ?? DEFAULTS.OLLAMA_TRANSLATION_URL,
      model: process.env['TRANSLATION_MODEL'] ?? DEFAULTS.TRANSLATION_MODEL,
      timeoutMs: safeParseInt(
        process.env['TRANSLATION_TIMEOUT_MS'],
        DEFAULTS.TRANSLATION_TIMEOUT_MS,
        'TRANSLATION_TIMEOUT_MS',
      ),
      retries: safeParseInt(
        process.env['TRANSLATION_RETRIES'],
        DEFAULTS.TRANSLATION_RETRIES,
        'TRANSLATION_RETRIES',
      ),
    },
  };
}

/**
 * Gets Ollama configuration from environment
 *
 * @returns Ollama configuration object
 */
export function getOllamaConfig(): OllamaConfig {
  return loadEnvConfig().ollama;
}
