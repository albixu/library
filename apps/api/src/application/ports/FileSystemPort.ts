/**
 * FileSystemPort (Driven/Output Port)
 *
 * Defines the contract for file system operations required by the application.
 * This is a port in the hexagonal architecture - the actual implementation
 * (e.g., NodeFileSystemAdapter) will be an adapter in the infrastructure layer.
 */

/**
 * FileSystemPort Interface
 *
 * Provides operations for interacting with the file system.
 */
export interface FileSystemPort {
  /**
   * Checks whether a file exists at the given path
   *
   * @param path - Absolute path to the file
   * @returns Promise resolving to true if the file exists, false otherwise
   */
  fileExists(path: string): Promise<boolean>;
}
