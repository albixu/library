/**
 * Persistence Utilities
 *
 * Shared utility functions for database persistence operations.
 */

/**
 * Checks if an error is a duplicate key violation from PostgreSQL.
 *
 * This detects unique constraint violations which can occur when:
 * - Inserting a duplicate ISBN
 * - Inserting a duplicate author name
 * - Inserting a duplicate category name
 * - Any other unique constraint violation
 *
 * @param error - The error to check
 * @returns true if the error indicates a duplicate key violation
 */
export function isDuplicateKeyError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes('duplicate key') ||
      error.message.includes('unique constraint') ||
      error.message.includes('UNIQUE constraint')
    );
  }
  return false;
}
