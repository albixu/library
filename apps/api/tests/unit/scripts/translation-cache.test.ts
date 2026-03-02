/**
 * Unit tests for translation-cache.ts
 *
 * Tests cover:
 * - loadCache: happy path, missing file, corrupted JSON, wrong shape
 * - saveCache: atomic write (write + rename)
 * - getCacheKey: determinism, uniqueness, format
 * - get: hit, miss
 * - set: insert, update
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock node:fs/promises BEFORE importing the module under test
vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  rename: vi.fn(),
}));

import { readFile, writeFile, rename } from 'node:fs/promises';
import {
  loadCache,
  saveCache,
  getCacheKey,
  get,
  set,
  type TranslationCache,
} from '../../../scripts/translation-cache.js';

const mockReadFile = vi.mocked(readFile);
const mockWriteFile = vi.mocked(writeFile);
const mockRename = vi.mocked(rename);

describe('translation-cache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // loadCache
  // ---------------------------------------------------------------------------
  describe('loadCache', () => {
    it('should return the parsed cache when file exists and is valid JSON', async () => {
      const cacheData: TranslationCache = {
        abc123: 'Traducción de prueba',
        def456: 'Otra traducción',
      };
      mockReadFile.mockResolvedValueOnce(JSON.stringify(cacheData) as never);

      const result = await loadCache('/some/path/.translation-cache.json');

      expect(result).toEqual(cacheData);
    });

    it('should return an empty object when the file does not exist (ENOENT)', async () => {
      const error = Object.assign(new Error('ENOENT: no such file'), { code: 'ENOENT' });
      mockReadFile.mockRejectedValueOnce(error);

      const result = await loadCache('/some/path/.translation-cache.json');

      expect(result).toEqual({});
    });

    it('should return an empty object when the file contains invalid JSON', async () => {
      mockReadFile.mockResolvedValueOnce('{ this is not valid json' as never);

      const result = await loadCache('/some/path/.translation-cache.json');

      expect(result).toEqual({});
    });

    it('should return an empty object when the file contains a JSON array', async () => {
      mockReadFile.mockResolvedValueOnce(JSON.stringify(['entry1', 'entry2']) as never);

      const result = await loadCache('/some/path/.translation-cache.json');

      expect(result).toEqual({});
    });

    it('should return an empty object when the file contains a JSON null', async () => {
      mockReadFile.mockResolvedValueOnce(JSON.stringify(null) as never);

      const result = await loadCache('/some/path/.translation-cache.json');

      expect(result).toEqual({});
    });

    it('should return an empty object when the file contains a JSON string', async () => {
      mockReadFile.mockResolvedValueOnce(JSON.stringify('just a string') as never);

      const result = await loadCache('/some/path/.translation-cache.json');

      expect(result).toEqual({});
    });

    it('should return an empty object on any unexpected read error', async () => {
      mockReadFile.mockRejectedValueOnce(new Error('Permission denied'));

      const result = await loadCache('/some/path/.translation-cache.json');

      expect(result).toEqual({});
    });

    it('should return a cache with multiple entries correctly', async () => {
      const cacheData: TranslationCache = {
        key1: 'value1',
        key2: 'value2',
        key3: 'value3',
      };
      mockReadFile.mockResolvedValueOnce(JSON.stringify(cacheData) as never);

      const result = await loadCache('/path/to/cache.json');

      expect(Object.keys(result)).toHaveLength(3);
      expect(result['key1']).toBe('value1');
      expect(result['key2']).toBe('value2');
      expect(result['key3']).toBe('value3');
    });
  });

  // ---------------------------------------------------------------------------
  // saveCache
  // ---------------------------------------------------------------------------
  describe('saveCache', () => {
    it('should write to a .tmp file and then rename it to the target path', async () => {
      mockWriteFile.mockResolvedValueOnce(undefined);
      mockRename.mockResolvedValueOnce(undefined);

      const cachePath = '/data/.translation-cache.json';
      const cache: TranslationCache = { abc: 'Hola mundo' };

      await saveCache(cachePath, cache);

      expect(mockWriteFile).toHaveBeenCalledTimes(1);
      expect(mockWriteFile).toHaveBeenCalledWith(
        `${cachePath}.tmp`,
        JSON.stringify(cache, null, 2),
        'utf-8',
      );
      expect(mockRename).toHaveBeenCalledTimes(1);
      expect(mockRename).toHaveBeenCalledWith(`${cachePath}.tmp`, cachePath);
    });

    it('should call rename AFTER writeFile (atomic write order)', async () => {
      const callOrder: string[] = [];
      mockWriteFile.mockImplementationOnce(async () => {
        callOrder.push('writeFile');
      });
      mockRename.mockImplementationOnce(async () => {
        callOrder.push('rename');
      });

      await saveCache('/path/cache.json', {});

      expect(callOrder).toEqual(['writeFile', 'rename']);
    });

    it('should serialize the cache as formatted JSON (2-space indent)', async () => {
      mockWriteFile.mockResolvedValueOnce(undefined);
      mockRename.mockResolvedValueOnce(undefined);

      const cache: TranslationCache = { key1: 'value1' };
      await saveCache('/path/cache.json', cache);

      const writtenContent = mockWriteFile.mock.calls[0]![1] as string;
      expect(writtenContent).toBe(JSON.stringify(cache, null, 2));
    });

    it('should propagate writeFile errors', async () => {
      mockWriteFile.mockRejectedValueOnce(new Error('Disk full'));

      await expect(saveCache('/path/cache.json', {})).rejects.toThrow('Disk full');
      expect(mockRename).not.toHaveBeenCalled();
    });

    it('should propagate rename errors', async () => {
      mockWriteFile.mockResolvedValueOnce(undefined);
      mockRename.mockRejectedValueOnce(new Error('Cross-device rename'));

      await expect(saveCache('/path/cache.json', {})).rejects.toThrow('Cross-device rename');
    });

    it('should correctly serialize an empty cache', async () => {
      mockWriteFile.mockResolvedValueOnce(undefined);
      mockRename.mockResolvedValueOnce(undefined);

      await saveCache('/path/cache.json', {});

      const writtenContent = mockWriteFile.mock.calls[0]![1] as string;
      expect(JSON.parse(writtenContent)).toEqual({});
    });
  });

  // ---------------------------------------------------------------------------
  // getCacheKey
  // ---------------------------------------------------------------------------
  describe('getCacheKey', () => {
    it('should return a 64-character lowercase hex string (SHA-256)', () => {
      const key = getCacheKey('some text');

      expect(key).toHaveLength(64);
      expect(key).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should be deterministic: same text always produces the same key', () => {
      const text = 'A book description about TypeScript';
      expect(getCacheKey(text)).toBe(getCacheKey(text));
    });

    it('should produce different keys for different texts', () => {
      const key1 = getCacheKey('Description one');
      const key2 = getCacheKey('Description two');
      expect(key1).not.toBe(key2);
    });

    it('should be case-sensitive: uppercase and lowercase produce different keys', () => {
      expect(getCacheKey('Hello World')).not.toBe(getCacheKey('hello world'));
    });

    it('should handle empty string without throwing', () => {
      expect(() => getCacheKey('')).not.toThrow();
      expect(getCacheKey('')).toHaveLength(64);
    });

    it('should handle long text without throwing', () => {
      const longText = 'a'.repeat(5000);
      expect(() => getCacheKey(longText)).not.toThrow();
      expect(getCacheKey(longText)).toHaveLength(64);
    });

    it('should handle unicode text without throwing', () => {
      const unicodeText = '日本語のテキスト 中文 한국어';
      expect(() => getCacheKey(unicodeText)).not.toThrow();
      expect(getCacheKey(unicodeText)).toHaveLength(64);
    });
  });

  // ---------------------------------------------------------------------------
  // get
  // ---------------------------------------------------------------------------
  describe('get', () => {
    it('should return the cached translation when the key exists', () => {
      const key = getCacheKey('original text');
      const cache: TranslationCache = { [key]: 'texto original traducido' };

      expect(get(cache, key)).toBe('texto original traducido');
    });

    it('should return undefined when the key does not exist', () => {
      const cache: TranslationCache = { someOtherKey: 'value' };

      expect(get(cache, 'nonExistentKey')).toBeUndefined();
    });

    it('should return undefined for an empty cache', () => {
      expect(get({}, 'anyKey')).toBeUndefined();
    });

    it('should handle keys that are SHA-256 hashes', () => {
      const text = 'This is a real book description';
      const key = getCacheKey(text);
      const cache: TranslationCache = { [key]: 'Esta es una descripción real del libro' };

      expect(get(cache, key)).toBe('Esta es una descripción real del libro');
    });
  });

  // ---------------------------------------------------------------------------
  // set
  // ---------------------------------------------------------------------------
  describe('set', () => {
    it('should add a new entry to the cache', () => {
      const cache: TranslationCache = {};
      const key = getCacheKey('new text');

      set(cache, key, 'nuevo texto');

      expect(cache[key]).toBe('nuevo texto');
    });

    it('should update an existing entry', () => {
      const key = getCacheKey('existing text');
      const cache: TranslationCache = { [key]: 'old translation' };

      set(cache, key, 'updated translation');

      expect(cache[key]).toBe('updated translation');
    });

    it('should not remove other entries when adding a new one', () => {
      const key1 = getCacheKey('text one');
      const key2 = getCacheKey('text two');
      const cache: TranslationCache = { [key1]: 'texto uno' };

      set(cache, key2, 'texto dos');

      expect(cache[key1]).toBe('texto uno');
      expect(cache[key2]).toBe('texto dos');
      expect(Object.keys(cache)).toHaveLength(2);
    });

    it('should mutate the cache object in place', () => {
      const cache: TranslationCache = {};
      const originalRef = cache;

      set(cache, 'key', 'value');

      // Same reference, mutated in place
      expect(cache).toBe(originalRef);
      expect(cache['key']).toBe('value');
    });

    it('should handle empty string as translation value', () => {
      const cache: TranslationCache = {};
      set(cache, 'key', '');
      expect(cache['key']).toBe('');
    });
  });
});
