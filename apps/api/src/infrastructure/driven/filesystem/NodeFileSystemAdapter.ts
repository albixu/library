/**
 * NodeFileSystemAdapter
 *
 * Implements the FileSystemPort using Node.js built-in fs/promises module.
 * This is a driven/output adapter in the hexagonal architecture.
 */

import { access } from 'node:fs/promises';
import type { FileSystemPort } from '../../../application/ports/FileSystemPort.js';

/**
 * NodeFileSystemAdapter
 *
 * Adapter that implements FileSystemPort using Node.js fs/promises.
 */
export class NodeFileSystemAdapter implements FileSystemPort {
  /**
   * Checks whether a file exists at the given path.
   *
   * @param path - Absolute file system path to check
   * @returns Promise resolving to true if file exists, false otherwise
   */
  async fileExists(path: string): Promise<boolean> {
    try {
      await access(path);
      return true;
    } catch {
      return false;
    }
  }
}
