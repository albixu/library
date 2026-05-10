/**
 * Unit Tests: ForgotPasswordUseCase
 *
 * Tests for the use case that initiates the password reset flow.
 * HU-038: JWT-based authentication — forgot password.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForgotPasswordUseCase } from '../../../../../src/application/use-cases/auth/ForgotPasswordUseCase.js';
import { User } from '../../../../../src/domain/user/User.js';
import type { UserRepository } from '../../../../../src/domain/user/ports/UserRepository.js';
import type { PasswordResetTokenRepository } from '../../../../../src/domain/user/ports/PasswordResetTokenRepository.js';
import type { EmailPort } from '../../../../../src/application/ports/EmailPort.js';

describe('ForgotPasswordUseCase', () => {
  let mockUserRepository: UserRepository;
  let mockTokenRepository: PasswordResetTokenRepository;
  let mockEmailPort: EmailPort;
  let useCase: ForgotPasswordUseCase;

  const fakeUser = User.fromPersistence({
    id: '550e8400-e29b-41d4-a716-446655440001',
    email: 'user@example.com',
    passwordHash: '$2b$10$hashedpassword',
    createdAt: new Date('2026-01-01T00:00:00Z'),
  });

  const appBaseUrl = 'https://app.example.com';

  beforeEach(() => {
    mockUserRepository = {
      findByEmail: vi.fn(),
      findById: vi.fn(),
      save: vi.fn(),
      updatePassword: vi.fn(),
    };

    mockTokenRepository = {
      create: vi.fn(),
      findValidByTokenHash: vi.fn(),
      markAsUsed: vi.fn(),
      deleteExpired: vi.fn(),
    };

    mockEmailPort = {
      sendWithAttachment: vi.fn(),
      send: vi.fn(),
    };

    useCase = new ForgotPasswordUseCase({
      userRepository: mockUserRepository,
      tokenRepository: mockTokenRepository,
      emailPort: mockEmailPort,
      appBaseUrl,
    });
  });

  describe('execute — email exists', () => {
    it('should create a reset token and send the email when user exists', async () => {
      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(fakeUser);

      await useCase.execute({ email: 'user@example.com' });

      expect(mockTokenRepository.create).toHaveBeenCalledOnce();
      expect(mockEmailPort.send).toHaveBeenCalledOnce();
    });

    it('should send email containing the reset link with the plain token', async () => {
      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(fakeUser);

      await useCase.execute({ email: 'user@example.com' });

      const sendCall = vi.mocked(mockEmailPort.send).mock.calls[0][0];
      expect(sendCall.to).toBe('user@example.com');
      expect(sendCall.body).toContain(`${appBaseUrl}/reset-password?token=`);
    });

    it('should store a hashed token (different from the plain token in the email)', async () => {
      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(fakeUser);

      await useCase.execute({ email: 'user@example.com' });

      const createCall = vi.mocked(mockTokenRepository.create).mock.calls[0][0];
      const sendCall = vi.mocked(mockEmailPort.send).mock.calls[0][0];

      // Extract plain token from the link
      const url = new URL(sendCall.body.match(/https?:\/\/\S+/)?.[0] ?? '');
      const plainToken = url.searchParams.get('token') ?? '';

      // The stored hash must differ from the plain token
      expect(createCall.tokenHash).not.toBe(plainToken);
      expect(createCall.tokenHash).toHaveLength(64); // SHA-256 hex = 64 chars
    });

    it('should create the token with the correct userId and a future expiry', async () => {
      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(fakeUser);

      const before = new Date();
      await useCase.execute({ email: 'user@example.com' });
      const after = new Date();

      const createCall = vi.mocked(mockTokenRepository.create).mock.calls[0][0];
      expect(createCall.userId).toBe(fakeUser.id.value);
      expect(createCall.expiresAt.getTime()).toBeGreaterThan(before.getTime());
      // Should expire ~24h from now
      const twentyFourHoursMs = 24 * 60 * 60 * 1000;
      expect(createCall.expiresAt.getTime()).toBeLessThanOrEqual(
        after.getTime() + twentyFourHoursMs + 1000,
      );
    });
  });

  describe('execute — email does not exist', () => {
    it('should return void silently without sending an email', async () => {
      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(null);

      const result = await useCase.execute({ email: 'unknown@example.com' });

      expect(result).toBeUndefined();
      expect(mockEmailPort.send).not.toHaveBeenCalled();
      expect(mockTokenRepository.create).not.toHaveBeenCalled();
    });

    it('should not throw when user is not found', async () => {
      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(null);

      await expect(useCase.execute({ email: 'ghost@example.com' })).resolves.not.toThrow();
    });
  });
});
