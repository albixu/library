/**
 * Auth Schemas (Zod)
 *
 * Input validation schemas for authentication endpoints.
 *
 * HU-038: Authentication HTTP input schemas.
 */

import { z } from 'zod';

/**
 * POST /api/auth/login — request body
 */
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginBody = z.infer<typeof loginSchema>;

/**
 * POST /api/auth/forgot-password — request body
 */
export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export type ForgotPasswordBody = z.infer<typeof forgotPasswordSchema>;

/**
 * POST /api/auth/reset-password — request body
 */
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

export type ResetPasswordBody = z.infer<typeof resetPasswordSchema>;
