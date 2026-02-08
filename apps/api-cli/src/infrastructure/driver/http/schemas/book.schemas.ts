/**
 * Book Validation Schemas
 *
 * Zod schemas for HTTP request/response validation.
 * These schemas provide input validation at the API boundary before
 * data reaches the application layer.
 */

import { z } from 'zod';
import { BOOK_TYPES } from '../../../../domain/value-objects/BookType.js';
import { BOOK_FORMATS } from '../../../../domain/value-objects/BookFormat.js';

/**
 * Schema for creating a book via POST /api/books
 *
 * Field constraints mirror domain entity rules but are enforced at API boundary
 * for better error messages and early rejection of invalid requests.
 */
export const createBookSchema = z.object({
  title: z
    .string({ required_error: 'title is required' })
    .min(1, 'title cannot be empty')
    .max(500, 'title exceeds maximum length of 500 characters')
    .transform((val) => val.trim()),

  author: z
    .string({ required_error: 'author is required' })
    .min(1, 'author cannot be empty')
    .max(300, 'author exceeds maximum length of 300 characters')
    .transform((val) => val.trim()),

  description: z
    .string({ required_error: 'description is required' })
    .min(1, 'description cannot be empty')
    .max(5000, 'description exceeds maximum length of 5000 characters')
    .transform((val) => val.trim()),

  type: z.enum(BOOK_TYPES, {
    required_error: 'type is required',
    invalid_type_error: `type must be one of: ${BOOK_TYPES.join(', ')}`,
  }),

  format: z.enum(BOOK_FORMATS, {
    required_error: 'format is required',
    invalid_type_error: `format must be one of: ${BOOK_FORMATS.join(', ')}`,
  }),

  categories: z
    .array(
      z
        .string()
        .min(1, 'category name cannot be empty')
        .max(100, 'category name exceeds maximum length of 100 characters')
        .transform((val) => val.trim())
    )
    .min(1, 'at least one category is required')
    .max(10, 'maximum of 10 categories allowed'),

  isbn: z
    .string()
    .nullish()
    .transform((val) => (val === '' ? null : val?.trim() ?? null)),

  available: z.boolean().optional().default(true),

  path: z
    .string()
    .max(1000, 'path exceeds maximum length of 1000 characters')
    .nullish()
    .transform((val) => (val === '' ? null : val?.trim() ?? null)),
});

/**
 * Inferred type for create book request body
 */
export type CreateBookRequest = z.infer<typeof createBookSchema>;

/**
 * Response schema for created book (without embedding)
 */
export const bookResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  author: z.string(),
  description: z.string(),
  type: z.enum(BOOK_TYPES),
  format: z.enum(BOOK_FORMATS),
  categories: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
    })
  ),
  isbn: z.string().nullable(),
  available: z.boolean(),
  path: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Inferred type for book response
 */
export type BookResponse = z.infer<typeof bookResponseSchema>;

/**
 * Error response schema
 */
export const errorResponseSchema = z.object({
  error: z.string(),
  details: z.array(z.string()).optional(),
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;
