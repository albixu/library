/**
 * JwtServiceImpl Unit Tests
 *
 * Tests the JWT signing and verification adapter.
 * Does NOT require a database — pure unit tests.
 *
 * Run with: npx vitest run tests/unit/infrastructure/driven/auth/JwtServiceImpl.test.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { JwtServiceImpl } from '../../../../../src/infrastructure/driven/auth/JwtServiceImpl.js';
import { InvalidCredentialsError } from '../../../../../src/domain/user/errors/UserErrors.js';

const JWT_SECRET = 'test-access-secret-32-chars-long!!';
const JWT_REFRESH_SECRET = 'test-refresh-secret-32-chars-long!';

describe('JwtServiceImpl', () => {
  let service: JwtServiceImpl;

  beforeEach(() => {
    service = new JwtServiceImpl(JWT_SECRET, JWT_REFRESH_SECRET);
  });

  describe('signTokens', () => {
    it('should return an access token and a refresh token', async () => {
      const result = await service.signTokens('user-id-123', 'user@example.com');

      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
      expect(result.accessToken).not.toBe(result.refreshToken);
    });

    it('should produce tokens with the correct payload', async () => {
      const userId = 'user-uuid-abc';
      const email = 'test@library.com';
      const { accessToken } = await service.signTokens(userId, email);

      const decoded = await service.verifyAccessToken(accessToken);
      expect(decoded.userId).toBe(userId);
      expect(decoded.email).toBe(email);
    });
  });

  describe('verifyAccessToken', () => {
    it('should decode a valid access token', async () => {
      const { accessToken } = await service.signTokens('user-1', 'a@b.com');

      const payload = await service.verifyAccessToken(accessToken);

      expect(payload.userId).toBe('user-1');
      expect(payload.email).toBe('a@b.com');
    });

    it('should throw InvalidCredentialsError for a tampered token', async () => {
      await expect(
        service.verifyAccessToken('invalid.token.here'),
      ).rejects.toThrow(InvalidCredentialsError);
    });

    it('should throw InvalidCredentialsError when verifying a refresh token as access token', async () => {
      const { refreshToken } = await service.signTokens('user-1', 'a@b.com');

      // refresh token was signed with a different secret
      await expect(
        service.verifyAccessToken(refreshToken),
      ).rejects.toThrow(InvalidCredentialsError);
    });

    it('should throw InvalidCredentialsError for an empty string', async () => {
      await expect(
        service.verifyAccessToken(''),
      ).rejects.toThrow(InvalidCredentialsError);
    });
  });

  describe('verifyRefreshToken', () => {
    it('should decode a valid refresh token', async () => {
      const { refreshToken } = await service.signTokens('user-2', 'b@c.com');

      const payload = await service.verifyRefreshToken(refreshToken);

      expect(payload.userId).toBe('user-2');
      expect(payload.email).toBe('b@c.com');
    });

    it('should throw InvalidCredentialsError for a tampered token', async () => {
      await expect(
        service.verifyRefreshToken('bad.token'),
      ).rejects.toThrow(InvalidCredentialsError);
    });

    it('should throw InvalidCredentialsError when verifying an access token as refresh token', async () => {
      const { accessToken } = await service.signTokens('user-2', 'b@c.com');

      // access token was signed with a different secret
      await expect(
        service.verifyRefreshToken(accessToken),
      ).rejects.toThrow(InvalidCredentialsError);
    });
  });
});
