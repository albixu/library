/**
 * Common API Response Schemas
 *
 * Standardized response structure for all API endpoints.
 * Provides consistent format for success and error responses.
 *
 * Part of HU-004: Standardize API Response Structure
 */

/**
 * Error structure for API responses
 *
 * @property message - Human-readable error description
 * @property details - Optional array of detailed error messages (e.g., validation errors)
 */
export interface ApiError {
  message: string;
  details?: string[];
}

/**
 * Standard API response wrapper
 *
 * All API responses follow this structure for consistency:
 * - Success: { success: true, data: T, error: null }
 * - Error: { success: false, data: null, error: ApiError }
 *
 * @template T - Type of the data payload
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
}

/**
 * Success response type (narrowed for type safety)
 */
export interface ApiSuccessResponse<T> extends ApiResponse<T> {
  success: true;
  data: T;
  error: null;
}

/**
 * Error response type (narrowed for type safety)
 */
export interface ApiErrorResponse extends ApiResponse<never> {
  success: false;
  data: null;
  error: ApiError;
}

/**
 * Creates a standardized success response
 *
 * @param data - The data payload to include in the response
 * @returns ApiResponse with success: true, data, and error: null
 *
 * @example
 * // Object data
 * successResponse({ id: '123', title: 'Clean Code' })
 * // => { success: true, data: { id: '123', title: 'Clean Code' }, error: null }
 *
 * @example
 * // Array data
 * successResponse([{ id: '1' }, { id: '2' }])
 * // => { success: true, data: [{ id: '1' }, { id: '2' }], error: null }
 *
 * @example
 * // Empty array (valid for list endpoints)
 * successResponse([])
 * // => { success: true, data: [], error: null }
 */
export function successResponse<T>(data: T): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    error: null,
  };
}

/**
 * Creates a standardized error response
 *
 * @param message - Human-readable error message
 * @param details - Optional array of detailed error messages
 * @returns ApiResponse with success: false, data: null, and error object
 *
 * @example
 * // Simple error
 * errorResponse('Not found')
 * // => { success: false, data: null, error: { message: 'Not found' } }
 *
 * @example
 * // Validation error with details
 * errorResponse('Validation failed', ['title is required', 'author is required'])
 * // => { success: false, data: null, error: { message: 'Validation failed', details: [...] } }
 */
export function errorResponse(
  message: string,
  details?: string[]
): ApiErrorResponse {
  const error: ApiError = { message };

  if (details !== undefined) {
    error.details = details;
  }

  return {
    success: false,
    data: null,
    error,
  };
}
