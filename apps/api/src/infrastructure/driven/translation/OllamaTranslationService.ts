/**
 * OllamaTranslationService Adapter
 *
 * Implements the TranslationService port by connecting to Ollama's API
 * to translate text using the qwen2.5:3b model.
 *
 * This is a driven/output adapter in the hexagonal architecture.
 */

import type {
  TranslationService,
  TranslationServiceConfig,
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
 * Default timeout for translation requests (60 seconds)
 */
const DEFAULT_TIMEOUT_MS = 60000;

/**
 * Default number of retry attempts
 */
const DEFAULT_RETRIES = 3;

/**
 * Base delay for exponential backoff (ms)
 */
const BASE_BACKOFF_MS = 1000;

/**
 * Mapping from ISO 639-1 codes to language names for translation prompts.
 * Covers most common languages; unknown codes fall back to the code itself.
 */
const ISO_639_1_LANGUAGE_NAMES: Readonly<Record<string, string>> = Object.freeze({
  ar: 'Arabic',
  de: 'German',
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  it: 'Italian',
  ja: 'Japanese',
  ko: 'Korean',
  pt: 'Portuguese',
  ru: 'Russian',
  zh: 'Chinese',
});

/**
 * Ollama API response for text generation
 */
interface OllamaGenerateResponse {
  response?: string;
  done?: boolean;
}

/**
 * System prompt for translation
 */
const TRANSLATION_SYSTEM_PROMPT = `You are a professional translator. Translate the following text to Spanish.
Rules:
- Be precise: do not add or remove information
- Maintain the original meaning and tone
- Keep technical terms when appropriate
- Output ONLY the translated text, nothing else
- Do not include any explanations, notes, or commentary`;

/**
 * OllamaTranslationService
 *
 * Adapter that implements TranslationService using Ollama's REST API.
 * Handles connection errors, timeouts, retries with exponential backoff,
 * and response validation.
 */
export class OllamaTranslationService implements TranslationService {
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly retries: number;

  constructor(config: TranslationServiceConfig) {
    this.baseUrl = config.baseUrl;
    this.model = config.model;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.retries = config.retries ?? DEFAULT_RETRIES;
  }

  /**
   * Translates text to the specified target language using Ollama
   *
   * @param text - The text to translate (max 5000 characters)
   * @param targetLanguage - ISO 639-1 language code (e.g., 'es')
   * @returns Promise resolving to the translation result
   * @throws TranslationError if text exceeds 5000 characters
   * @throws TranslationServiceUnavailableError if Ollama is not reachable
   */
  async translate(text: string, targetLanguage: string): Promise<TranslationResult> {
    const trimmedText = text.trim();

    // Handle empty text
    if (trimmedText.length === 0) {
      return {
        translatedText: '',
        targetLanguage,
        model: this.model,
      };
    }

    // Validate text length before making API call
    if (trimmedText.length > MAX_TEXT_LENGTH) {
      throw new TranslationError(
        `Text too long for translation: ${trimmedText.length} characters (max ${MAX_TEXT_LENGTH})`,
      );
    }

    // Build prompt with target language instruction
    const languageName = this.getLanguageName(targetLanguage);
    const prompt = `${TRANSLATION_SYSTEM_PROMPT.replace('Spanish', languageName)}\n\nText to translate:\n${trimmedText}`;

    // Attempt translation with retries
    let lastError: Error | undefined;
    for (let attempt = 0; attempt < this.retries; attempt++) {
      try {
        const translatedText = await this.callOllama(prompt);
        return {
          translatedText: translatedText.trim(),
          targetLanguage,
          model: this.model,
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
   * Calls Ollama API to generate translation
   */
  private async callOllama(prompt: string): Promise<string> {
    const url = `${this.baseUrl}/api/generate`;
    const body = JSON.stringify({
      model: this.model,
      prompt,
      stream: false,
      options: {
        temperature: 0.3,
        top_p: 0.9,
      },
    });

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
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
    let data: OllamaGenerateResponse;
    try {
      data = (await response.json()) as OllamaGenerateResponse;
    } catch (error) {
      throw new TranslationServiceUnavailableError(
        `Failed to parse response: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { cause: error },
      );
    }

    // Validate response format
    if (typeof data.response !== 'string') {
      throw new TranslationError('Invalid response format: missing response text');
    }

    return data.response;
  }

  /**
   * Checks if the Ollama service is available and healthy
   *
   * @returns Promise resolving to true if service is available, false otherwise
   */
  async isAvailable(): Promise<boolean> {
    const url = `${this.baseUrl}/api/tags`;

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
   * Converts ISO 639-1 code to language name
   */
  private getLanguageName(code: string): string {
    return ISO_639_1_LANGUAGE_NAMES[code.toLowerCase()] ?? code;
  }

  /**
   * Sleep for a specified number of milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
