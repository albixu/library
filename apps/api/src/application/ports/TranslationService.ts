/**
 * TranslationService Port (Driven/Output Port)
 *
 * Defines the contract for translating text between languages.
 * This is a port in the hexagonal architecture - the actual implementation
 * (e.g., OllamaTranslationService) will be an adapter in the infrastructure layer.
 *
 * The translation service is used to translate book descriptions to Spanish
 * for consistent embedding generation and search functionality.
 */

/**
 * Configuration for the translation service
 */
export interface TranslationServiceConfig {
  /** Base URL of the translation service (e.g., 'http://ollama:11434') */
  baseUrl: string;
  /** Model to use for translation (e.g., 'llama3.2:1b') */
  model: string;
  /** Request timeout in milliseconds (default: 60000) */
  timeoutMs?: number;
  /** Number of retry attempts (default: 3) */
  retries?: number;
}

/**
 * Result of a translation request
 */
export interface TranslationResult {
  /** The translated text */
  translatedText: string;
  /** The source language (if detected) */
  sourceLanguage?: string;
  /** The target language */
  targetLanguage: string;
  /** The model used for translation */
  model: string;
}

/**
 * TranslationService Port Interface
 *
 * Implementations must handle:
 * - Connection errors (throw TranslationServiceUnavailableError)
 * - Timeout errors (throw TranslationServiceUnavailableError)
 * - Invalid responses (throw TranslationError)
 *
 * Note: Error classes are defined in application/errors/ApplicationErrors.ts
 */
export interface TranslationService {
  /**
   * Translates text to the specified target language
   *
   * @param text - The text to translate (max 5000 characters)
   * @param targetLanguage - ISO 639-1 language code (e.g., 'es', 'en')
   * @returns Promise resolving to the translation result
   * @throws TranslationServiceUnavailableError if the service is not reachable
   * @throws TranslationError for other translation-related errors
   */
  translate(text: string, targetLanguage: string): Promise<TranslationResult>;

  /**
   * Checks if the translation service is available and healthy
   *
   * @returns Promise resolving to true if service is available, false otherwise
   */
  isAvailable(): Promise<boolean>;
}
