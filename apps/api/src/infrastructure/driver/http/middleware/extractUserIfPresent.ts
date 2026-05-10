/**
 * extractUserIfPresent
 *
 * Reads the access_token cookie from a Fastify request.
 * If the token is present and valid, returns the UserId.
 * If the token is absent or invalid, returns undefined — never throws.
 *
 * HU-039: Optional auth extraction for endpoints that support both
 * authenticated and unauthenticated access.
 */

import type { FastifyRequest } from 'fastify';
import type { JwtService } from '../../../../domain/user/ports/JwtService.js';
import { UserId } from '../../../../domain/user/value-objects/UserId.js';

const COOKIE_ACCESS_TOKEN = 'access_token';

/**
 * Extracts the authenticated UserId from the request cookie, if present and valid.
 *
 * @param request - Fastify request
 * @param jwtService - JWT service for token verification
 * @returns UserId if authenticated, undefined otherwise
 */
export async function extractUserIfPresent(
  request: FastifyRequest,
  jwtService: JwtService,
): Promise<UserId | undefined> {
  const token = request.cookies?.[COOKIE_ACCESS_TOKEN];

  if (!token) {
    return undefined;
  }

  try {
    const payload = await jwtService.verifyAccessToken(token);
    return UserId.create(payload.userId);
  } catch {
    return undefined;
  }
}
