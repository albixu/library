/**
 * NodeFileSystemAdapter Unit Tests
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { NodeFileSystemAdapter } from '../../../../../src/infrastructure/driven/filesystem/NodeFileSystemAdapter.js';

vi.mock('node:fs/promises', () => ({
  access: vi.fn(),
}));

import { access } from 'node:fs/promises';

const mockAccess = vi.mocked(access);

describe('NodeFileSystemAdapter', () => {
  let adapter: NodeFileSystemAdapter;

  afterEach(() => {
    vi.resetAllMocks();
  });

  beforeEach(() => {
    adapter = new NodeFileSystemAdapter();
  });

  describe('fileExists', () => {
    it('should return true when file exists', async () => {
      mockAccess.mockResolvedValueOnce(undefined);

      const result = await adapter.fileExists('/some/path/book.epub');

      expect(result).toBe(true);
      expect(mockAccess).toHaveBeenCalledWith('/some/path/book.epub');
    });

    it('should return false when file does not exist', async () => {
      mockAccess.mockRejectedValueOnce(new Error('ENOENT: no such file or directory'));

      const result = await adapter.fileExists('/some/path/nonexistent.epub');

      expect(result).toBe(false);
      expect(mockAccess).toHaveBeenCalledWith('/some/path/nonexistent.epub');
    });

    it('should return false when access is denied', async () => {
      mockAccess.mockRejectedValueOnce(new Error('EACCES: permission denied'));

      const result = await adapter.fileExists('/protected/file.epub');

      expect(result).toBe(false);
    });
  });
});
