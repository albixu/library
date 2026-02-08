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
 * Safely parses an integer from a string value
 *
 * @param value - The string value to parse
 * @param defaultValue - The default value to return if parsing fails
 * @param fieldName - The name of the field being parsed (for error messages)
 * @returns The parsed integer or the default value
 * @throws Error if the parsed value is NaN and no default is provided
 */
function safeParseInt(
  value: string | undefined,
  defaultValue: number,
  fieldName: string
): number {
  const stringValue = value ?? String(defaultValue);
  const parsed = parseInt(stringValue, 10);

  if (!Number.isFinite(parsed)) {
    throw new Error(
      `Configuration error: ${fieldName} must be a valid number, got: "${stringValue}"`
    );
  }

  return parsed;
}

/**
 * Loads and validates environment configuration
 *
 * @returns Complete environment configuration object
 * @throws Error if required environment variables are missing
 */
export function loadEnvConfig(): EnvConfig {
  return {
    app: {
      nodeEnv: process.env['NODE_ENV'] ?? DEFAULTS.NODE_ENV,
      port: safeParseInt(process.env['PORT'], DEFAULTS.PORT, 'PORT'),
      logLevel: process.env['LOG_LEVEL'] ?? DEFAULTS.LOG_LEVEL,
    },
    database: {
      url: process.env['DATABASE_URL'] ?? '',
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
