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
}

/**
 * Default configuration values
 */
const DEFAULTS = {
  NODE_ENV: 'development',
  PORT: 3000,
  LOG_LEVEL: 'debug',
  OLLAMA_BASE_URL: 'http://ollama:11434',
  OLLAMA_MODEL: 'nomic-embed-text',
  OLLAMA_TIMEOUT_MS: 30000,
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
      `Invalid integer value for ${fieldName}: "${value}". Expected a valid number.`
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
        'Please set it in your environment or .env file (e.g., postgresql://user:password@host:5432/database)'
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
      baseUrl: process.env['OLLAMA_BASE_URL'] ?? DEFAULTS.OLLAMA_BASE_URL,
      model: process.env['OLLAMA_MODEL'] ?? DEFAULTS.OLLAMA_MODEL,
      timeoutMs: safeParseInt(
        process.env['OLLAMA_TIMEOUT_MS'],
        DEFAULTS.OLLAMA_TIMEOUT_MS,
        'OLLAMA_TIMEOUT_MS'
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
