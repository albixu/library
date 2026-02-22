/**
 * Book Level Validation Schemas
 *
 * Zod schemas for HTTP request/response validation.
 * These schemas provide input validation at the API boundary.
 *
 * HU-010: Used for GET /api/book-levels endpoint.
 */

import { z } from 'zod';

/**
 * Schema for query parameters when listing book levels
 *
 * - type: Optional type name to filter levels (case-insensitive)
 */
export const listBookLevelsQuerySchema = z.object({
  type: z
    .string()
    .max(100, 'type exceeds maximum length of 100 characters')
    .optional()
    .transform((val) => val?.trim() || undefined),
});

/**
 * Inferred type for list book levels query parameters
 */
export type ListBookLevelsQuery = z.infer<typeof listBookLevelsQuerySchema>;

/**
 * Schema for a single book level item in list responses
 */
export const bookLevelListItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
});

/**
 * Inferred type for book level list item
 */
export type BookLevelListItemResponse = z.infer<typeof bookLevelListItemSchema>;

/**
 * Schema for the full book level list response
 */
export const bookLevelListResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(bookLevelListItemSchema),
  error: z.null(),
});

/**
 * Inferred type for book level list response
 */
export type BookLevelListResponse = z.infer<typeof bookLevelListResponseSchema>;
