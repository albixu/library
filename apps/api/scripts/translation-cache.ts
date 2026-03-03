/**
 * Module: translation-cache.ts
 *
 * Provides a persistent translation cache backed by multiple partitioned JSON files.
 * Cache entries are indexed by a SHA-256 hash of the original text, making the
 * cache content-addressable and language-agnostic.
 *
 * Design principles:
 * - Partitioned: cache is split into N files based on the first 2 hex chars of the hash.
 *   This gives up to 256 buckets (00–ff), keeping each file small (~100KB vs ~87MB monolithic)
 *   and avoiding I/O hangs on slow volumes (e.g. Docker bind mounts on Windows).
 * - Pure module: no side effects on import
 * - Atomic writes: write-then-rename to prevent cache corruption
 * - Fault-tolerant: missing or corrupted cache files are silently ignored
 * - Deterministic: same text always produces the same cache key and bucket
 * - Lazy loading: partition files are loaded on first access (not all upfront)
 * - Dirty tracking: only partitions with new writes are persisted on save
 *
 * File layout:
 *   <cacheDir>/partition-<XX>.json   where XX is the first 2 hex chars of the key
 *   e.g. apps/api/tmp/cache/partition-a3.json
 *
 * Migration from legacy single-file cache:
 *   If a legacy single-file cache is found at <cacheDir>.json (or passed as a .json path),
 *   it is automatically migrated to the partitioned layout on first load.
 */

import { readFile, writeFile, rename, mkdir, readdir, unlink } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, dirname, basename, extname } from 'node:path';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * In-memory representation of a single cache partition.
 * Keys are SHA-256 hashes of the original text.
 * Values are the translated texts (always Spanish in this context).
 */
export type TranslationCache = Record<string, string>;

/**
 * Opaque handle to the partitioned cache.
 * Consumers should treat this as a black box and use the module functions.
 */
export interface PartitionedCache {
  /** Absolute path to the cache directory */
  readonly cacheDir: string;
  /** In-memory partitions, keyed by 2-char hex prefix */
  readonly partitions: Map<string, TranslationCache>;
  /** Set of partition prefixes that have been modified since last save */
  readonly dirtyPartitions: Set<string>;
  /** Total number of entries across all loaded partitions */
  totalEntries: number;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Returns the 2-char hex prefix (bucket) for a given cache key.
 * This is the first 2 characters of the SHA-256 hex digest.
 */
function getBucket(key: string): string {
  return key.substring(0, 2);
}

/**
 * Returns the absolute path to a partition file.
 */
function getPartitionPath(cacheDir: string, bucket: string): string {
  return join(cacheDir, `partition-${bucket}.json`);
}

/**
 * Loads a single partition file from disk.
 * Returns an empty object on any error (missing file, invalid JSON, wrong shape).
 */
async function loadPartition(partitionPath: string): Promise<TranslationCache> {
  try {
    const content = await readFile(partitionPath, 'utf-8');
    const parsed: unknown = JSON.parse(content);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as TranslationCache;
    }
    return {};
  } catch {
    return {};
  }
}

/**
 * Persists a single partition to disk using an atomic write (write tmp → rename).
 */
async function savePartition(partitionPath: string, partition: TranslationCache): Promise<void> {
  const tmpPath = `${partitionPath}.tmp`;
  await writeFile(tmpPath, JSON.stringify(partition, null, 2), 'utf-8');
  await rename(tmpPath, partitionPath);
}

// ---------------------------------------------------------------------------
// Migration from legacy single-file cache
// ---------------------------------------------------------------------------

/**
 * Migrates a legacy single-file cache to the partitioned layout.
 * Reads the legacy file, distributes entries into partitions, saves them,
 * and removes the legacy file.
 *
 * @param legacyPath - Path to the legacy single-file cache JSON
 * @param cacheDir   - Target directory for the partitioned cache
 * @returns Number of entries migrated
 */
async function migrateLegacyCache(legacyPath: string, cacheDir: string): Promise<number> {
  let legacy: TranslationCache;
  try {
    const content = await readFile(legacyPath, 'utf-8');
    const parsed: unknown = JSON.parse(content);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return 0;
    }
    legacy = parsed as TranslationCache;
  } catch {
    return 0;
  }

  const keys = Object.keys(legacy);
  if (keys.length === 0) return 0;

  // Group by bucket
  const byBucket = new Map<string, TranslationCache>();
  for (const key of keys) {
    const bucket = getBucket(key);
    if (!byBucket.has(bucket)) byBucket.set(bucket, {});
    byBucket.get(bucket)![key] = legacy[key]!;
  }

  // Write each partition
  await mkdir(cacheDir, { recursive: true });
  for (const [bucket, partition] of byBucket) {
    await savePartition(getPartitionPath(cacheDir, bucket), partition);
  }

  // Remove legacy file
  try {
    await unlink(legacyPath);
  } catch {
    // Non-critical — ignore if already gone
  }

  console.log(`  Cache migration: ${keys.length} entries distributed into ${byBucket.size} partitions`);
  return keys.length;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Opens (or creates) a partitioned cache rooted at the given directory.
 *
 * If a legacy single-file cache is found alongside the directory
 * (i.e. <cacheDir>.json exists), it is automatically migrated.
 *
 * Does NOT eagerly load all partitions — they are loaded lazily on first access.
 *
 * @param cacheDir - Absolute path to the cache directory (NOT a .json file path)
 * @returns A PartitionedCache handle
 */
export async function openCache(cacheDir: string): Promise<PartitionedCache> {
  await mkdir(cacheDir, { recursive: true });

  // Check for legacy single-file cache at <cacheDir>/translation-cache.json
  // (backwards-compat: previously the path was the full .json path, now it's the dir)
  const legacyPath = join(cacheDir, 'translation-cache.json');
  try {
    await readFile(legacyPath, 'utf-8'); // just check existence
    console.log(`  Found legacy cache at ${legacyPath}, migrating to partitioned layout...`);
    await migrateLegacyCache(legacyPath, cacheDir);
  } catch {
    // No legacy file — that's fine
  }

  // Count total entries across all existing partition files
  let totalEntries = 0;
  try {
    const files = await readdir(cacheDir);
    const partitionFiles = files.filter(f => f.startsWith('partition-') && f.endsWith('.json'));
    // Do a quick count without loading all data into memory
    for (const file of partitionFiles) {
      try {
        const content = await readFile(join(cacheDir, file), 'utf-8');
        const parsed = JSON.parse(content) as Record<string, unknown>;
        totalEntries += Object.keys(parsed).length;
      } catch {
        // ignore corrupt files
      }
    }
  } catch {
    // Directory empty or unreadable
  }

  return {
    cacheDir,
    partitions: new Map(),
    dirtyPartitions: new Set(),
    totalEntries,
  };
}

/**
 * Retrieves a cached translation.
 * Lazily loads the partition file on first access for this bucket.
 *
 * @param cache - The PartitionedCache handle
 * @param key   - The cache key (SHA-256 hash of the original text)
 * @returns The cached translation, or `undefined` if not present
 */
export async function getAsync(cache: PartitionedCache, key: string): Promise<string | undefined> {
  const bucket = getBucket(key);

  if (!cache.partitions.has(bucket)) {
    const partition = await loadPartition(getPartitionPath(cache.cacheDir, bucket));
    cache.partitions.set(bucket, partition);
  }

  return cache.partitions.get(bucket)![key];
}

/**
 * Adds or updates a translation entry in the cache (in-memory only).
 * Marks the partition as dirty so it will be persisted on the next `saveDirty` call.
 *
 * @param cache       - The PartitionedCache handle
 * @param key         - The cache key (SHA-256 hash of the original text)
 * @param translation - The translated text to store
 */
export function setEntry(cache: PartitionedCache, key: string, translation: string): void {
  const bucket = getBucket(key);

  if (!cache.partitions.has(bucket)) {
    // Partition wasn't loaded yet — create it in memory (will be merged on save)
    cache.partitions.set(bucket, {});
  }

  const partition = cache.partitions.get(bucket)!;
  const isNew = !(key in partition);
  partition[key] = translation;

  if (isNew) cache.totalEntries++;
  cache.dirtyPartitions.add(bucket);
}

/**
 * Persists only the dirty partitions to disk.
 * Clears the dirty set after saving.
 *
 * @param cache - The PartitionedCache handle
 */
export async function saveDirty(cache: PartitionedCache): Promise<void> {
  for (const bucket of cache.dirtyPartitions) {
    const partition = cache.partitions.get(bucket);
    if (partition !== undefined) {
      await savePartition(getPartitionPath(cache.cacheDir, bucket), partition);
    }
  }
  cache.dirtyPartitions.clear();
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

// ---------------------------------------------------------------------------
// Legacy API — kept for backwards compatibility with existing tests
// ---------------------------------------------------------------------------

/** @deprecated Use openCache + getAsync + setEntry + saveDirty instead */
export async function loadCache(cachePath: string): Promise<TranslationCache> {
  try {
    const content = await readFile(cachePath, 'utf-8');
    const parsed: unknown = JSON.parse(content);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as TranslationCache;
    }
    return {};
  } catch {
    return {};
  }
}

/** @deprecated Use saveDirty instead */
export async function saveCache(cachePath: string, cache: TranslationCache): Promise<void> {
  const tmpPath = `${cachePath}.tmp`;
  await writeFile(tmpPath, JSON.stringify(cache, null, 2), 'utf-8');
  await rename(tmpPath, cachePath);
}

/** @deprecated Use getAsync instead */
export function get(cache: TranslationCache, key: string): string | undefined {
  return cache[key];
}

/** @deprecated Use setEntry instead */
export function set(cache: TranslationCache, key: string, translation: string): void {
  cache[key] = translation;
}
