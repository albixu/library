/**
 * LibreTranslateTranslationService Adapter
 *
 * Implements the TranslationService port by connecting to a self-hosted
 * LibreTranslate instance via its REST API.
 *
 * This is a driven/output adapter in the hexagonal architecture.
 * Designed for high-throughput bulk translation (e.g., consolidate-books script).
 *
 * Key differences from OllamaTranslationService:
 * - Uses LibreTranslate REST API (POST /translate) instead of Ollama
 * - No model name required — LibreTranslate handles language model selection internally
 * - Returns 'libretranslate' as the model identifier
 * - Skips API call when source language is already Spanish ('es')
 */

import type {
  TranslationService,
  TranslationResult,
} from '../../../application/ports/TranslationService.js';
import {
  TranslationServiceUnavailableError,
  TranslationError,
} from '../../../application/errors/ApplicationErrors.js';

/**
 * Maximum text length for translation (characters)
 */
const MAX_TEXT_LENGTH = 5000;

/**
 * Default timeout for translation requests (10 seconds)
 */
const DEFAULT_TIMEOUT_MS = 10000;

/**
 * Default number of retry attempts
 */
const DEFAULT_RETRIES = 3;

/**
 * Base delay for exponential backoff (ms)
 */
const BASE_BACKOFF_MS = 1000;

/**
 * Model identifier returned in TranslationResult
 */
const MODEL_IDENTIFIER = 'libretranslate';

/**
 * Configuration for LibreTranslateTranslationService
 */
export interface LibreTranslateConfig {
  /** Base URL of the LibreTranslate service (e.g., 'http://libretranslate:5000') */
  baseUrl: string;
  /** Request timeout in milliseconds (default: 10000) */
  timeoutMs?: number;
  /** Number of retry attempts (default: 3) */
  retries?: number;
}

/**
 * LibreTranslate API request body
 */
interface LibreTranslateRequest {
  q: string;
  source: string;
  target: string;
  format: 'text';
}

/**
 * LibreTranslate API response
 */
interface LibreTranslateResponse {
  translatedText?: string;
  error?: string;
}

/**
 * LibreTranslateTranslationService
 *
 * Adapter that implements TranslationService using the LibreTranslate REST API.
 * Handles connection errors, timeouts, retries with exponential backoff,
 * response validation, and skips translation when source is already Spanish.
 */
export class LibreTranslateTranslationService implements TranslationService {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly retries: number;

  constructor(config: LibreTranslateConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // strip trailing slash
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.retries = config.retries ?? DEFAULT_RETRIES;
  }

  /**
   * Translates text to the specified target language using LibreTranslate.
   *
   * If the source language is already the target language, returns the original
   * text without making an API call (optimization for Spanish-to-Spanish).
   *
   * @param text - The text to translate (max 5000 characters)
   * @param targetLanguage - ISO 639-1 language code of the target (e.g., 'es')
   * @param sourceLanguage - ISO 639-1 language code of the source (default: 'en')
   * @returns Promise resolving to the translation result
   * @throws TranslationError if text exceeds 5000 characters or response is invalid
   * @throws TranslationServiceUnavailableError if LibreTranslate is not reachable
   */
  async translate(
    text: string,
    targetLanguage: string,
    sourceLanguage = 'en',
  ): Promise<TranslationResult> {
    const trimmedText = text.trim();

    // Handle empty text
    if (trimmedText.length === 0) {
      return {
        translatedText: '',
        targetLanguage,
        sourceLanguage,
        model: MODEL_IDENTIFIER,
      };
    }

    // Validate text length before making API call
    if (trimmedText.length > MAX_TEXT_LENGTH) {
      throw new TranslationError(
        `Text too long for translation: ${trimmedText.length} characters (max ${MAX_TEXT_LENGTH})`,
      );
    }

    // Skip translation if source is already the target language
    if (sourceLanguage.toLowerCase() === targetLanguage.toLowerCase()) {
      return {
        translatedText: trimmedText,
        targetLanguage,
        sourceLanguage,
        model: MODEL_IDENTIFIER,
      };
    }

    // Attempt translation with retries
    let lastError: Error | undefined;
    for (let attempt = 0; attempt < this.retries; attempt++) {
      try {
        const translatedText = await this.callLibreTranslate(
          trimmedText,
          sourceLanguage,
          targetLanguage,
        );
        return {
          translatedText: translatedText.trim(),
          targetLanguage,
          sourceLanguage,
          model: MODEL_IDENTIFIER,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on validation errors (TranslationError)
        if (error instanceof TranslationError) {
          throw error;
        }

        // Wait before retrying with exponential backoff
        if (attempt < this.retries - 1) {
          const delayMs = BASE_BACKOFF_MS * Math.pow(2, attempt);
          await this.sleep(delayMs);
        }
      }
    }

    // All retries exhausted
    throw new TranslationServiceUnavailableError(
      `Failed after ${this.retries} attempts: ${lastError?.message ?? 'Unknown error'}`,
      { cause: lastError },
    );
  }

  /**
   * Calls LibreTranslate API to perform translation
   */
  private async callLibreTranslate(
    text: string,
    source: string,
    target: string,
  ): Promise<string> {
    const url = `${this.baseUrl}/translate`;
    const requestBody: LibreTranslateRequest = {
      q: text,
      source,
      target,
      format: 'text',
    };

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      throw new TranslationServiceUnavailableError(this.getErrorMessage(error), {
        cause: error,
      });
    }

    if (!response.ok) {
      throw new TranslationServiceUnavailableError(
        `HTTP ${response.status}: ${response.statusText}`,
      );
    }

    // Parse response JSON
    let data: LibreTranslateResponse;
    try {
      data = (await response.json()) as LibreTranslateResponse;
    } catch (error) {
      throw new TranslationServiceUnavailableError(
        `Failed to parse response: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { cause: error },
      );
    }

    // Validate response format
    if (typeof data.translatedText !== 'string') {
      throw new TranslationError('Invalid response format: missing translatedText field');
    }

    return data.translatedText;
  }

  /**
   * Checks if the LibreTranslate service is available and healthy
   *
   * @returns Promise resolving to true if service is available, false otherwise
   */
  async isAvailable(): Promise<boolean> {
    const url = `${this.baseUrl}/languages`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // Short timeout for health check
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Extracts a readable error message from an unknown error
   */
  private getErrorMessage(error: unknown): string {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return 'Request timeout';
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'Unknown error';
  }

  /**
   * Sleep for a specified number of milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
