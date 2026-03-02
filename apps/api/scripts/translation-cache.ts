/**
 * Module: translation-cache.ts
 *
 * Provides a persistent translation cache backed by a JSON file.
 * Cache entries are indexed by a SHA-256 hash of the original text,
 * making the cache content-addressable and language-agnostic.
 *
 * Design principles:
 * - Pure module: no side effects on import
 * - Atomic writes: write-then-rename to prevent cache corruption
 * - Fault-tolerant: missing or corrupted cache files are silently ignored
 * - Deterministic: same text always produces the same cache key
 */

import { readFile, writeFile, rename } from 'node:fs/promises';
import { createHash } from 'node:crypto';

/**
 * In-memory representation of the translation cache.
 * Keys are SHA-256 hashes of the original text.
 * Values are the translated texts (always Spanish in this context).
 */
export type TranslationCache = Record<string, string>;

/**
 * Loads the translation cache from a JSON file.
 *
 * Returns an empty cache object if:
 * - The file does not exist
 * - The file is not valid JSON
 * - The file does not contain a plain object
 *
 * Never throws.
 *
 * @param cachePath - Absolute path to the cache JSON file
 * @returns The loaded cache, or an empty object on any error
 */
export async function loadCache(cachePath: string): Promise<TranslationCache> {
  try {
    const content = await readFile(cachePath, 'utf-8');
    const parsed: unknown = JSON.parse(content);

    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as TranslationCache;
    }

    // Valid JSON but wrong shape — treat as empty
    return {};
  } catch {
    // File not found, permission error, or invalid JSON — start fresh
    return {};
  }
}

/**
 * Persists the translation cache to a JSON file using an atomic write.
 *
 * Writes to a temporary file first, then renames it to the target path.
 * This guarantees that the cache file is never left in a partially-written
 * state, even if the process is interrupted mid-write.
 *
 * @param cachePath - Absolute path to the cache JSON file
 * @param cache - The cache object to persist
 */
export async function saveCache(cachePath: string, cache: TranslationCache): Promise<void> {
  const tmpPath = `${cachePath}.tmp`;
  await writeFile(tmpPath, JSON.stringify(cache, null, 2), 'utf-8');
  await rename(tmpPath, cachePath);
}

/**
 * Generates a deterministic cache key for the given text.
 *
 * Uses SHA-256 so the key space is collision-resistant and the
 * key is independent of the book title, ISBN, or file order.
 *
 * @param text - The original (untranslated) text
 * @returns A 64-character lowercase hex string (SHA-256 digest)
 */
export function getCacheKey(text: string): string {
  return createHash('sha256').update(text, 'utf-8').digest('hex');
}

/**
 * Retrieves a cached translation.
 *
 * @param cache - The in-memory cache object
 * @param key - The cache key (SHA-256 hash of the original text)
 * @returns The cached translation, or `undefined` if not present
 */
export function get(cache: TranslationCache, key: string): string | undefined {
  return cache[key];
}

/**
 * Adds or updates a translation entry in the cache.
 *
 * Note: This mutates the cache object in place. The caller is responsible
 * for persisting the cache to disk via `saveCache` after calling this.
 *
 * @param cache - The in-memory cache object to update
 * @param key - The cache key (SHA-256 hash of the original text)
 * @param translation - The translated text to store
 */
export function set(cache: TranslationCache, key: string, translation: string): void {
  cache[key] = translation;
}
