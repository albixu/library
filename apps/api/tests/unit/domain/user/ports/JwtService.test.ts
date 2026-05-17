import { describe, it, expect, vi } from 'vitest';
import type { JwtService, TokenPair } from '../../../../../src/domain/user/ports/JwtService.js';

describe('JwtService port', () => {
  it('should fulfil the contract with a mock implementation', async () => {
    const tokenPair: TokenPair = {
      accessToken: 'access.token.here',
      refreshToken: 'refresh.token.here',
    };

    const jwtService: JwtService = {
      signTokens: vi.fn().mockResolvedValue(tokenPair),
      verifyAccessToken: vi.fn().mockResolvedValue({ userId: 'user-id', email: 'user@example.com' }),
      verifyRefreshToken: vi.fn().mockResolvedValue({ userId: 'user-id', email: 'user@example.com' }),
    };

    const tokens = await jwtService.signTokens('user-id', 'user@example.com');
    expect(tokens).toEqual(tokenPair);
    expect(tokens.accessToken).toBe('access.token.here');
    expect(tokens.refreshToken).toBe('refresh.token.here');

    const accessPayload = await jwtService.verifyAccessToken('access.token.here');
    expect(accessPayload).toEqual({ userId: 'user-id', email: 'user@example.com' });

    const refreshPayload = await jwtService.verifyRefreshToken('refresh.token.here');
    expect(refreshPayload).toEqual({ userId: 'user-id', email: 'user@example.com' });
  });

  it('should reject an invalid access token', async () => {
    const jwtService: JwtService = {
      signTokens: vi.fn(),
      verifyAccessToken: vi.fn().mockRejectedValue(new Error('Invalid token')),
      verifyRefreshToken: vi.fn(),
    };

    await expect(jwtService.verifyAccessToken('bad.token')).rejects.toThrow('Invalid token');
  });

  it('should reject an invalid refresh token', async () => {
    const jwtService: JwtService = {
      signTokens: vi.fn(),
      verifyAccessToken: vi.fn(),
      verifyRefreshToken: vi.fn().mockRejectedValue(new Error('Invalid token')),
    };

    await expect(jwtService.verifyRefreshToken('bad.token')).rejects.toThrow('Invalid token');
  });
});
