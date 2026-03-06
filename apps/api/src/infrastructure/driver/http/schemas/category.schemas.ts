/**
 * Category Validation Schemas
 *
 * Zod schemas for HTTP request/response validation.
 * These schemas provide input validation at the API boundary.
 *
 * HU-009: Used for GET /api/categories endpoint.
 */

import { z } from 'zod';

/**
 * Schema for query parameters when listing categories
 *
 * - type: Optional type name to filter categories (case-insensitive)
 */
export const listCategoriesQuerySchema = z.object({
  type: z
    .string()
    .max(100, 'type exceeds maximum length of 100 characters')
    .optional()
    .transform((val) => val?.trim() || undefined),
});

/**
 * Inferred type for list categories query parameters
 */
export type ListCategoriesQuery = z.infer<typeof listCategoriesQuerySchema>;

/**
 * Schema for a single category item in list responses
 */
export const categoryListItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  typeId: z.string().uuid(),
  description: z.string().nullable(),
});

/**
 * Inferred type for category list item
 */
export type CategoryListItemResponse = z.infer<typeof categoryListItemSchema>;

/**
 * Schema for the full category list response
 */
export const categoryListResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(categoryListItemSchema),
  error: z.null(),
});

/**
 * Inferred type for category list response
 */
export type CategoryListResponse = z.infer<typeof categoryListResponseSchema>;
