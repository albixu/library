/**
 * Unit Tests: ResetPasswordUseCase
 *
 * Tests for the use case that validates a reset token and updates the password.
 * HU-038: JWT-based authentication — reset password.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResetPasswordUseCase } from '../../../../../src/application/use-cases/auth/ResetPasswordUseCase.js';
import {
  PasswordResetTokenInvalidError,
  PasswordResetTokenExpiredError,
} from '../../../../../src/domain/user/errors/UserErrors.js';
import type { PasswordResetTokenRepository, PasswordResetToken } from '../../../../../src/domain/user/ports/PasswordResetTokenRepository.js';
import type { UserRepository } from '../../../../../src/domain/user/ports/UserRepository.js';
import type { PasswordHasher } from '../../../../../src/domain/user/ports/PasswordHasher.js';

describe('ResetPasswordUseCase', () => {
  let mockTokenRepository: PasswordResetTokenRepository;
  let mockUserRepository: UserRepository;
  let mockPasswordHasher: PasswordHasher;
  let useCase: ResetPasswordUseCase;

  const plainToken = 'some-random-plain-token';

  const validToken: PasswordResetToken = {
    id: 'token-uuid-001',
    userId: 'user-uuid-001',
    tokenHash: 'will-be-matched-by-hash',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1h from now
    usedAt: null,
  };

  const expiredToken: PasswordResetToken = {
    ...validToken,
    expiresAt: new Date(Date.now() - 60 * 60 * 1000), // 1h ago
  };

  const usedToken: PasswordResetToken = {
    ...validToken,
    usedAt: new Date('2026-01-01T00:00:00Z'),
  };

  beforeEach(() => {
    mockTokenRepository = {
      create: vi.fn(),
      findValidByTokenHash: vi.fn(),
      markAsUsed: vi.fn(),
      deleteExpired: vi.fn(),
    };

    mockUserRepository = {
      findByEmail: vi.fn(),
      findById: vi.fn(),
      save: vi.fn(),
      updatePassword: vi.fn(),
    };

    mockPasswordHasher = {
      hash: vi.fn(),
      verify: vi.fn(),
    };

    useCase = new ResetPasswordUseCase({
      tokenRepository: mockTokenRepository,
      userRepository: mockUserRepository,
      passwordHasher: mockPasswordHasher,
    });
  });

  describe('execute — happy path', () => {
    it('should update the password and mark the token as used', async () => {
      vi.mocked(mockTokenRepository.findValidByTokenHash).mockResolvedValue(validToken);
      vi.mocked(mockPasswordHasher.hash).mockResolvedValue('$2b$10$newhashedpassword');

      await useCase.execute({ token: plainToken, newPassword: 'NewSecure123!' });

      expect(mockUserRepository.updatePassword).toHaveBeenCalledWith(
        validToken.userId,
        '$2b$10$newhashedpassword',
      );
      expect(mockTokenRepository.markAsUsed).toHaveBeenCalledWith(validToken.id);
    });

    it('should hash the new password before storing it', async () => {
      vi.mocked(mockTokenRepository.findValidByTokenHash).mockResolvedValue(validToken);
      vi.mocked(mockPasswordHasher.hash).mockResolvedValue('$2b$10$newhashedpassword');

      await useCase.execute({ token: plainToken, newPassword: 'NewSecure123!' });

      expect(mockPasswordHasher.hash).toHaveBeenCalledWith('NewSecure123!');
    });

    it('should search for the token using SHA-256 hash of the plain token', async () => {
      vi.mocked(mockTokenRepository.findValidByTokenHash).mockResolvedValue(validToken);
      vi.mocked(mockPasswordHasher.hash).mockResolvedValue('hashed');

      await useCase.execute({ token: plainToken, newPassword: 'NewSecure123!' });

      const calledHash = vi.mocked(mockTokenRepository.findValidByTokenHash).mock.calls[0][0];
      // SHA-256 hex is always 64 chars
      expect(calledHash).toHaveLength(64);
      expect(calledHash).not.toBe(plainToken);
    });
  });

  describe('execute — token not found', () => {
    it('should throw PasswordResetTokenInvalidError when token does not exist', async () => {
      vi.mocked(mockTokenRepository.findValidByTokenHash).mockResolvedValue(null);

      await expect(
        useCase.execute({ token: plainToken, newPassword: 'NewSecure123!' }),
      ).rejects.toThrow(PasswordResetTokenInvalidError);
    });

    it('should throw PasswordResetTokenInvalidError when token is already used', async () => {
      // findValidByTokenHash returns null for used tokens (port contract)
      vi.mocked(mockTokenRepository.findValidByTokenHash).mockResolvedValue(null);

      await expect(
        useCase.execute({ token: plainToken, newPassword: 'NewSecure123!' }),
      ).rejects.toThrow(PasswordResetTokenInvalidError);
    });

    it('should not update password when token is not found', async () => {
      vi.mocked(mockTokenRepository.findValidByTokenHash).mockResolvedValue(null);

      await expect(
        useCase.execute({ token: plainToken, newPassword: 'NewSecure123!' }),
      ).rejects.toThrow(PasswordResetTokenInvalidError);

      expect(mockUserRepository.updatePassword).not.toHaveBeenCalled();
    });
  });

  describe('execute — token expired', () => {
    it('should throw PasswordResetTokenExpiredError when token is expired', async () => {
      vi.mocked(mockTokenRepository.findValidByTokenHash).mockResolvedValue(expiredToken);

      await expect(
        useCase.execute({ token: plainToken, newPassword: 'NewSecure123!' }),
      ).rejects.toThrow(PasswordResetTokenExpiredError);
    });

    it('should not update password when token is expired', async () => {
      vi.mocked(mockTokenRepository.findValidByTokenHash).mockResolvedValue(expiredToken);

      await expect(
        useCase.execute({ token: plainToken, newPassword: 'NewSecure123!' }),
      ).rejects.toThrow(PasswordResetTokenExpiredError);

      expect(mockUserRepository.updatePassword).not.toHaveBeenCalled();
    });
  });
});
