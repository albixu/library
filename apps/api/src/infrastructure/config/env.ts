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
 * Supported translation providers (HU-026)
 */
export type TranslationProvider = 'ollama' | 'libretranslate';

/**
 * Translation service configuration (HU-013)
 */
export interface TranslationConfig {
  /** Selected translation provider (HU-026) */
  provider: TranslationProvider;
  /** Base URL of the Ollama translation service */
  baseUrl: string;
  /** Model to use for translation (Ollama only) */
  model: string;
  /** Request timeout in milliseconds */
  timeoutMs: number;
  /** Number of retry attempts */
  retries: number;
  /** Base URL of the LibreTranslate service (HU-026) */
  libreTranslateUrl: string;
  /** Request timeout in milliseconds for LibreTranslate (HU-026) */
  libreTranslateTimeoutMs: number;
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
 * Gmail email service configuration (HU-036)
 * Both fields are optional — credentials are only required when the email service is actually used.
 */
export interface GmailConfig {
  /** Gmail account used as sender */
  user?: string;
  /** Google App Password (not the regular account password) */
  appPassword?: string;
}

/**
 * JWT authentication configuration (HU-038)
 */
export interface JwtConfig {
  /** Secret for signing access tokens */
  secret: string;
  /** Secret for signing refresh tokens */
  refreshSecret: string;
  /** Hours until a password reset token expires */
  passwordResetTokenExpiryHours: number;
  /** Base URL of the web client (used for reset links) */
  appBaseUrl: string;
}

/**
 * Complete environment configuration
 */
export interface EnvConfig {
  app: AppConfig;
  database: DatabaseConfig;
  ollama: OllamaConfig;
  translation: TranslationConfig; // HU-013
  gmail: GmailConfig; // HU-036
  jwt: JwtConfig; // HU-038
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
  OLLAMA_TIMEOUT_MS: 60000,
  // HU-013 & HU-021: Translation service defaults
  OLLAMA_TRANSLATION_URL: 'http://ollama-translations:11435',
  TRANSLATION_MODEL: 'llama3.2:1b',
  TRANSLATION_TIMEOUT_MS: 60000,
  TRANSLATION_RETRIES: 3,
  // HU-026: Translation provider selection
  TRANSLATION_PROVIDER: 'ollama' as const,
  LIBRETRANSLATE_URL: 'http://libretranslate:5000',
  LIBRETRANSLATE_TIMEOUT_MS: 10000,
  // HU-038: JWT defaults
  PASSWORD_RESET_TOKEN_EXPIRY_HOURS: 24,
  APP_BASE_URL: 'http://localhost:4200',
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
 * Validates and parses the TRANSLATION_PROVIDER environment variable.
 * Throws a descriptive error at startup if the value is not supported.
 */
function parseTranslationProvider(value: string | undefined): TranslationProvider {
  const resolved = (value ?? DEFAULTS.TRANSLATION_PROVIDER).trim();
  if (resolved === 'ollama' || resolved === 'libretranslate') {
    return resolved;
  }
  throw new Error(
    `Invalid TRANSLATION_PROVIDER value: "${resolved}". ` +
    'Supported values are: "ollama", "libretranslate".',
  );
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

  // HU-038: JWT secrets are required — fail-fast if not set
  const jwtSecret = process.env['JWT_SECRET'];
  if (!jwtSecret || jwtSecret.trim() === '') {
    throw new Error(
      'JWT_SECRET environment variable is required but not set. ' +
      'Please set a strong secret (min 32 chars) in your environment or .env file.',
    );
  }

  const jwtRefreshSecret = process.env['JWT_REFRESH_SECRET'];
  if (!jwtRefreshSecret || jwtRefreshSecret.trim() === '') {
    throw new Error(
      'JWT_REFRESH_SECRET environment variable is required but not set. ' +
      'Please set a strong secret (min 32 chars, different from JWT_SECRET) in your environment or .env file.',
    );
  }

  // HU-036: Gmail credentials are optional — only required when email service is used
  const gmailUser = process.env['GMAIL_USER']?.trim() || undefined;
  const gmailAppPassword = process.env['GMAIL_APP_PASSWORD']?.trim() || undefined;
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
      provider: parseTranslationProvider(process.env['TRANSLATION_PROVIDER']),
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
      // HU-026: LibreTranslate configuration
      libreTranslateUrl:
        process.env['LIBRETRANSLATE_URL'] ?? DEFAULTS.LIBRETRANSLATE_URL,
      libreTranslateTimeoutMs: safeParseInt(
        process.env['LIBRETRANSLATE_TIMEOUT_MS'],
        DEFAULTS.LIBRETRANSLATE_TIMEOUT_MS,
        'LIBRETRANSLATE_TIMEOUT_MS',
      ),
    },
    // HU-036: Gmail email service configuration
    gmail: {
      user: gmailUser,
      appPassword: gmailAppPassword,
    },
    // HU-038: JWT configuration
    jwt: {
      secret: jwtSecret,
      refreshSecret: jwtRefreshSecret,
      passwordResetTokenExpiryHours: safeParseInt(
        process.env['PASSWORD_RESET_TOKEN_EXPIRY_HOURS'],
        DEFAULTS.PASSWORD_RESET_TOKEN_EXPIRY_HOURS,
        'PASSWORD_RESET_TOKEN_EXPIRY_HOURS',
      ),
      appBaseUrl: process.env['APP_BASE_URL'] ?? DEFAULTS.APP_BASE_URL,
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
