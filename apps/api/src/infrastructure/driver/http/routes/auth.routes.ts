/**
 * Auth Routes
 *
 * Fastify route definitions for authentication endpoints.
 * Registered under the /api/auth prefix.
 *
 * Rate limiting is applied to POST /login (5 attempts / 15 min per IP).
 * Rate limiting is disabled in the `test` environment.
 *
 * HU-038: Authentication HTTP routes.
 */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import fastifyRateLimit from '@fastify/rate-limit';
import type { AuthController } from '../controllers/AuthController.js';

/**
 * Options for registering auth routes
 */
export interface AuthRoutesOptions extends FastifyPluginOptions {
  controller: AuthController;
  /** NODE_ENV value — rate limiting is disabled when set to 'test' */
  nodeEnv?: string;
}

/**
 * Registers authentication routes on a Fastify instance.
 *
 * Endpoints:
 * - POST /api/auth/login          — validate credentials + set cookies
 * - POST /api/auth/logout         — clear cookies
 * - POST /api/auth/refresh        — exchange refresh cookie for new token pair
 * - POST /api/auth/forgot-password — initiate password reset (always 200)
 * - POST /api/auth/reset-password  — complete password reset with token
 *
 * @param fastify  - Fastify instance (scoped plugin)
 * @param options  - Route options
 */
export async function authRoutes(
  fastify: FastifyInstance,
  options: AuthRoutesOptions,
): Promise<void> {
  const { controller, nodeEnv = 'production' } = options;
  const isTest = nodeEnv === 'test';

  /**
   * POST /auth/login
   * Rate-limited: 5 requests per 15 minutes per IP (disabled in test env).
   */
  if (!isTest) {
    await fastify.register(fastifyRateLimit, {
      max: 5,
      timeWindow: '15 minutes',
      // Apply only to this scoped instance (login route only)
      keyGenerator: (request) => request.ip,
      errorResponseBuilder: (_request, context) => ({
        success: false,
        data: null,
        error: {
          message: `Too many login attempts. Please try again in ${Math.ceil(context.ttl / 1000)} seconds.`,
        },
      }),
    });
  }

  fastify.post('/auth/login', async (request, reply) => {
    return controller.login(request, reply);
  });

  /**
   * POST /auth/logout
   * No rate limiting needed — clearing cookies is idempotent.
   */
  fastify.post('/auth/logout', { config: { rateLimit: false } }, async (request, reply) => {
    return controller.logout(request, reply);
  });

  /**
   * POST /auth/refresh
   * No rate limiting — protected by the validity of the refresh token.
   */
  fastify.post('/auth/refresh', { config: { rateLimit: false } }, async (request, reply) => {
    return controller.refresh(request, reply);
  });

  /**
   * POST /auth/forgot-password
   * No rate limiting configured here (can be added separately if needed).
   */
  fastify.post('/auth/forgot-password', { config: { rateLimit: false } }, async (request, reply) => {
    return controller.forgotPassword(request, reply);
  });

  /**
   * POST /auth/reset-password
   */
  fastify.post('/auth/reset-password', { config: { rateLimit: false } }, async (request, reply) => {
    return controller.resetPassword(request, reply);
  });
}
