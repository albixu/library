/**
 * Search and Pagination Constants
 *
 * Domain constants for search criteria configuration.
 * These values define the constraints and defaults for
 * pagination and semantic search operations.
 */

/**
 * Pagination constraints for search operations
 */
export const PAGINATION = {
  /** Default number of results per page */
  DEFAULT_LIMIT: 50,
  /** Minimum allowed limit */
  MIN_LIMIT: 1,
  /** Maximum allowed limit */
  MAX_LIMIT: 100,
} as const;

/**
 * Semantic search configuration
 */
export const SEMANTIC_SEARCH = {
  /**
   * Minimum similarity threshold for semantic search results.
   * Results with similarity score below this value are filtered out.
   * Value range: 0.0 to 1.0 (0% to 100%)
   */
  SIMILARITY_THRESHOLD: 0.55,
} as const;
