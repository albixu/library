/**
 * Search Books Query Schemas
 *
 * Zod schemas for validating query parameters in GET /api/books endpoint.
 * Handles coercion from query string format and provides defaults.
 *
 * HU-012: Search Books with Filters and Pagination
 *
 * Query Parameters:
 * - isbn: string - Exact ISBN match
 * - title: string - Partial title match (ILIKE)
 * - author: string - Partial author name match (ILIKE)
 * - text: string - Free text for semantic search
 * - types: string | string[] - List of type names (OR between values)
 * - categories: string | string[] - List of category names (OR between values)
 * - levels: string | string[] - List of level names (OR between values)
 * - limit: number (1-100, default 50)
 * - cursor: string - Opaque cursor for pagination
 */

import { z } from 'zod';

/**
 * Transforms a string or string array input into a normalized array
 * - Accepts single string or array of strings
 * - Trims and lowercases all values
 * - Filters out empty strings
 */
const stringOrArraySchema = z
  .union([z.string(), z.array(z.string())])
  .transform((val) => {
    const arr = Array.isArray(val) ? val : [val];
    return arr
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 0);
  })
  .refine((arr) => arr.length > 0, { message: 'Array cannot be empty' })
  .refine((arr) => arr.length <= 20, { message: 'Maximum of 20 values allowed' });

/**
 * Non-empty string schema that trims whitespace
 */
const nonEmptyStringSchema = (maxLength: number) =>
  z
    .string()
    .transform((val) => val.trim())
    .refine((val) => val.length > 0, { message: 'Cannot be empty' })
    .refine((val) => val.length <= maxLength, {
      message: `Exceeds maximum length of ${maxLength} characters`,
    });

/**
 * Schema for search books query parameters
 *
 * All parameters are optional. When multiple filters are provided,
 * they are combined with AND logic.
 */
export const searchBooksQuerySchema = z.object({
  // ISBN for exact match (max 17 chars for ISBN-13 with hyphens)
  isbn: nonEmptyStringSchema(17).optional(),

  // Title for partial match (max 500 chars)
  title: nonEmptyStringSchema(500).optional(),

  // Author name for partial match (max 300 chars)
  author: nonEmptyStringSchema(300).optional(),

  // Free text for semantic search (max 1000 chars)
  text: nonEmptyStringSchema(1000).optional(),

  // Type names (OR between values)
  types: stringOrArraySchema.optional(),

  // Category names (OR between values)
  categories: stringOrArraySchema.optional(),

  // Level names (OR between values)
  levels: stringOrArraySchema.optional(),

  // Pagination limit (1-100, default 50)
  limit: z.coerce
    .number()
    .int()
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit must be at most 100')
    .default(50),

  // Opaque cursor for pagination
  cursor: z
    .string()
    .min(1, 'Cursor cannot be empty')
    .optional(),

  // HU-039: Filter to show only books favorited by the authenticated user
  favorites: z
    .union([z.literal('true'), z.literal('false'), z.boolean()])
    .transform((val) => val === true || val === 'true')
    .optional(),
});

/**
 * Inferred type for search books query parameters
 */
export type SearchBooksQuery = z.infer<typeof searchBooksQuerySchema>;
