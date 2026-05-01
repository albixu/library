import { describe, it, expect, vi } from 'vitest';
import type { FileSystemPort } from '../../../../src/application/ports/FileSystemPort.js';

describe('FileSystemPort', () => {
  describe('contract', () => {
    it('should accept a mock implementation typed as FileSystemPort', () => {
      const mock: FileSystemPort = {
        fileExists: vi.fn().mockResolvedValue(true),
      };

      expect(mock).toBeDefined();
      expect(typeof mock.fileExists).toBe('function');
    });

    it('should return true when the file exists', async () => {
      const mock: FileSystemPort = {
        fileExists: vi.fn().mockResolvedValue(true),
      };

      const result = await mock.fileExists('/files/book.epub');

      expect(result).toBe(true);
      expect(mock.fileExists).toHaveBeenCalledWith('/files/book.epub');
    });

    it('should return false when the file does not exist', async () => {
      const mock: FileSystemPort = {
        fileExists: vi.fn().mockResolvedValue(false),
      };

      const result = await mock.fileExists('/files/missing.epub');

      expect(result).toBe(false);
      expect(mock.fileExists).toHaveBeenCalledWith('/files/missing.epub');
    });

    it('should propagate errors thrown by the implementation', async () => {
      const mock: FileSystemPort = {
        fileExists: vi.fn().mockRejectedValue(new Error('Permission denied')),
      };

      await expect(mock.fileExists('/restricted/file.epub')).rejects.toThrow('Permission denied');
    });
  });
});
