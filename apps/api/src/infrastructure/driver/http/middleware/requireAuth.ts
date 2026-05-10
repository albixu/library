/**
 * requireAuth
 *
 * Reads the access_token cookie from a Fastify request.
 * If the token is present and valid, returns the UserId.
 * If the token is absent or invalid, sends a 401 response and throws
 * to stop handler execution.
 *
 * HU-039: Mandatory auth guard for protected endpoints.
 */

import type { FastifyReply, FastifyRequest } from 'fastify';
import type { JwtService } from '../../../../domain/user/ports/JwtService.js';
import { UserId } from '../../../../domain/user/value-objects/UserId.js';
import { errorResponse } from '../schemas/common.schemas.js';

const COOKIE_ACCESS_TOKEN = 'access_token';

/**
 * Extracts the authenticated UserId from the request cookie.
 * Sends 401 and throws if the token is missing or invalid.
 *
 * @param request - Fastify request
 * @param reply - Fastify reply (used to send 401 response)
 * @param jwtService - JWT service for token verification
 * @returns UserId of the authenticated user
 * @throws If the token is missing or invalid (after sending 401)
 */
export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
  jwtService: JwtService,
): Promise<UserId> {
  const token = request.cookies?.[COOKIE_ACCESS_TOKEN];

  if (!token) {
    await reply.code(401).send(errorResponse('Authentication required'));
    throw new Error('Unauthorized');
  }

  try {
    const payload = await jwtService.verifyAccessToken(token);
    return UserId.create(payload.userId);
  } catch {
    await reply.code(401).send(errorResponse('Invalid or expired token'));
    throw new Error('Unauthorized');
  }
}
