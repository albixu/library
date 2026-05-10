import { describe, it, expect, vi } from 'vitest';
import type {
  PasswordResetToken,
  PasswordResetTokenRepository,
} from '../../../../../src/domain/user/ports/PasswordResetTokenRepository.js';

describe('PasswordResetTokenRepository port', () => {
  const validToken: PasswordResetToken = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    userId: '550e8400-e29b-41d4-a716-446655440000',
    tokenHash: 'sha256hashoftoken',
    expiresAt: new Date(Date.now() + 3600_000),
    usedAt: null,
  };

  it('should fulfil the contract with a mock implementation', async () => {
    const repo: PasswordResetTokenRepository = {
      create: vi.fn().mockResolvedValue(undefined),
      findValidByTokenHash: vi.fn().mockResolvedValue(validToken),
      markAsUsed: vi.fn().mockResolvedValue(undefined),
      deleteExpired: vi.fn().mockResolvedValue(undefined),
    };

    await expect(repo.create(validToken)).resolves.toBeUndefined();

    const found = await repo.findValidByTokenHash('sha256hashoftoken');
    expect(found).toEqual(validToken);
    expect(found?.usedAt).toBeNull();

    await expect(repo.markAsUsed(validToken.id)).resolves.toBeUndefined();
    await expect(repo.deleteExpired()).resolves.toBeUndefined();
  });

  it('should return null when token is not found or already used', async () => {
    const repo: PasswordResetTokenRepository = {
      create: vi.fn(),
      findValidByTokenHash: vi.fn().mockResolvedValue(null),
      markAsUsed: vi.fn(),
      deleteExpired: vi.fn(),
    };

    const result = await repo.findValidByTokenHash('nonexistent-hash');
    expect(result).toBeNull();
  });

  it('should store usedAt when token is consumed', async () => {
    const usedToken: PasswordResetToken = { ...validToken, usedAt: new Date() };

    const repo: PasswordResetTokenRepository = {
      create: vi.fn(),
      findValidByTokenHash: vi.fn().mockResolvedValue(usedToken),
      markAsUsed: vi.fn().mockResolvedValue(undefined),
      deleteExpired: vi.fn(),
    };

    const found = await repo.findValidByTokenHash('sha256hashoftoken');
    expect(found?.usedAt).toBeInstanceOf(Date);
  });
});
