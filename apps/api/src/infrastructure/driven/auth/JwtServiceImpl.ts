/**
 * JwtServiceImpl Adapter
 *
 * Implements the JwtService port using the jsonwebtoken library.
 * Signs access and refresh tokens with separate secrets and expiry times.
 *
 * HU-038: Infrastructure adapter for JWT token signing and verification.
 */

import jwt from 'jsonwebtoken';
import type { JwtService, TokenPair } from '../../../domain/user/ports/JwtService.js';
import { InvalidCredentialsError } from '../../../domain/user/errors/UserErrors.js';

/**
 * JWT payload structure embedded in tokens
 */
interface JwtPayload {
  userId: string;
  email: string;
}

/**
 * JwtServiceImpl
 *
 * Provides JWT signing and verification for access and refresh tokens.
 *
 * Access token:  signed with JWT_SECRET,         expires in 7 days
 * Refresh token: signed with JWT_REFRESH_SECRET, expires in 30 days
 */
export class JwtServiceImpl implements JwtService {
  constructor(
    private readonly jwtSecret: string,
    private readonly jwtRefreshSecret: string,
  ) {}

  /**
   * Signs and returns a new access/refresh token pair for the given user
   */
  async signTokens(userId: string, email: string): Promise<TokenPair> {
    const payload: JwtPayload = { userId, email };

    const accessToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: '7d',
    });

    const refreshToken = jwt.sign(payload, this.jwtRefreshSecret, {
      expiresIn: '30d',
    });

    return { accessToken, refreshToken };
  }

  /**
   * Verifies and decodes an access token
   *
   * @throws InvalidCredentialsError if the token is invalid, expired, or tampered with
   */
  async verifyAccessToken(token: string): Promise<{ userId: string; email: string }> {
    return this.verifyToken(token, this.jwtSecret);
  }

  /**
   * Verifies and decodes a refresh token
   *
   * @throws InvalidCredentialsError if the token is invalid, expired, or tampered with
   */
  async verifyRefreshToken(token: string): Promise<{ userId: string; email: string }> {
    return this.verifyToken(token, this.jwtRefreshSecret);
  }

  /**
   * Internal helper — verifies a token with the given secret
   */
  private verifyToken(token: string, secret: string): { userId: string; email: string } {
    try {
      const decoded = jwt.verify(token, secret) as JwtPayload;

      if (typeof decoded.userId !== 'string' || typeof decoded.email !== 'string') {
        throw new InvalidCredentialsError();
      }

      return { userId: decoded.userId, email: decoded.email };
    } catch (err) {
      if (err instanceof InvalidCredentialsError) {throw err;}
      throw new InvalidCredentialsError();
    }
  }
}
