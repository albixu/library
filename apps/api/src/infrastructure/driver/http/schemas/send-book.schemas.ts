/**
 * Send Book Validation Schemas
 *
 * Zod schemas for the POST /api/books/:id/send endpoint.
 *
 * HU-036: Send book by email feature.
 */

import { z } from 'zod';

/**
 * Schema for sending a book by email via POST /api/books/:id/send
 */
export const sendBookByEmailSchema = z.object({
  email: z.string().email('Must be a valid email address'),
});

export type SendBookByEmailBody = z.infer<typeof sendBookByEmailSchema>;
