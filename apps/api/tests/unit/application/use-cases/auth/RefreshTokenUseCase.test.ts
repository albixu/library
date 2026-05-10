/**
 * Unit Tests: RefreshTokenUseCase
 *
 * Tests for the use case that validates a refresh token and issues a new token pair.
 * HU-038: JWT-based authentication.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RefreshTokenUseCase } from '../../../../../src/application/use-cases/auth/RefreshTokenUseCase.js';
import { User } from '../../../../../src/domain/user/User.js';
import { InvalidCredentialsError } from '../../../../../src/domain/user/errors/UserErrors.js';
import type { UserRepository } from '../../../../../src/domain/user/ports/UserRepository.js';
import type { JwtService } from '../../../../../src/domain/user/ports/JwtService.js';

describe('RefreshTokenUseCase', () => {
  let mockUserRepository: UserRepository;
  let mockJwtService: JwtService;
  let useCase: RefreshTokenUseCase;

  const fakeUser = User.fromPersistence({
    id: '550e8400-e29b-41d4-a716-446655440001',
    email: 'user@example.com',
    passwordHash: '$2b$10$hashedpassword',
    createdAt: new Date('2026-01-01T00:00:00Z'),
  });

  const fakeTokenPair = {
    accessToken: 'new.access.token',
    refreshToken: 'new.refresh.token',
  };

  const validRefreshToken = 'valid.refresh.token';

  beforeEach(() => {
    mockUserRepository = {
      findByEmail: vi.fn(),
      findById: vi.fn(),
      save: vi.fn(),
      updatePassword: vi.fn(),
    };

    mockJwtService = {
      signTokens: vi.fn(),
      verifyAccessToken: vi.fn(),
      verifyRefreshToken: vi.fn(),
    };

    useCase = new RefreshTokenUseCase({
      userRepository: mockUserRepository,
      jwtService: mockJwtService,
    });
  });

  describe('execute — happy path', () => {
    it('should return a new token pair when refresh token is valid', async () => {
      vi.mocked(mockJwtService.verifyRefreshToken).mockResolvedValue({
        userId: fakeUser.id.value,
        email: fakeUser.email.value,
      });
      vi.mocked(mockUserRepository.findById).mockResolvedValue(fakeUser);
      vi.mocked(mockJwtService.signTokens).mockResolvedValue(fakeTokenPair);

      const result = await useCase.execute({ refreshToken: validRefreshToken });

      expect(result).toEqual(fakeTokenPair);
    });

    it('should verify the refresh token', async () => {
      vi.mocked(mockJwtService.verifyRefreshToken).mockResolvedValue({
        userId: fakeUser.id.value,
        email: fakeUser.email.value,
      });
      vi.mocked(mockUserRepository.findById).mockResolvedValue(fakeUser);
      vi.mocked(mockJwtService.signTokens).mockResolvedValue(fakeTokenPair);

      await useCase.execute({ refreshToken: validRefreshToken });

      expect(mockJwtService.verifyRefreshToken).toHaveBeenCalledWith(validRefreshToken);
    });

    it('should find user by id extracted from the token payload', async () => {
      vi.mocked(mockJwtService.verifyRefreshToken).mockResolvedValue({
        userId: fakeUser.id.value,
        email: fakeUser.email.value,
      });
      vi.mocked(mockUserRepository.findById).mockResolvedValue(fakeUser);
      vi.mocked(mockJwtService.signTokens).mockResolvedValue(fakeTokenPair);

      await useCase.execute({ refreshToken: validRefreshToken });

      expect(mockUserRepository.findById).toHaveBeenCalledWith(fakeUser.id.value);
    });

    it('should sign new tokens with the user id and email', async () => {
      vi.mocked(mockJwtService.verifyRefreshToken).mockResolvedValue({
        userId: fakeUser.id.value,
        email: fakeUser.email.value,
      });
      vi.mocked(mockUserRepository.findById).mockResolvedValue(fakeUser);
      vi.mocked(mockJwtService.signTokens).mockResolvedValue(fakeTokenPair);

      await useCase.execute({ refreshToken: validRefreshToken });

      expect(mockJwtService.signTokens).toHaveBeenCalledWith(
        fakeUser.id.value,
        fakeUser.email.value,
      );
    });
  });

  describe('execute — invalid refresh token', () => {
    it('should throw InvalidCredentialsError when token verification fails', async () => {
      vi.mocked(mockJwtService.verifyRefreshToken).mockRejectedValue(new Error('jwt expired'));

      await expect(
        useCase.execute({ refreshToken: 'expired.token' }),
      ).rejects.toThrow(InvalidCredentialsError);
    });

    it('should not look up the user when token verification fails', async () => {
      vi.mocked(mockJwtService.verifyRefreshToken).mockRejectedValue(new Error('invalid token'));

      await expect(
        useCase.execute({ refreshToken: 'tampered.token' }),
      ).rejects.toThrow(InvalidCredentialsError);

      expect(mockUserRepository.findById).not.toHaveBeenCalled();
    });
  });

  describe('execute — user not found', () => {
    it('should throw InvalidCredentialsError when user no longer exists', async () => {
      vi.mocked(mockJwtService.verifyRefreshToken).mockResolvedValue({
        userId: 'deleted-user-id',
        email: 'deleted@example.com',
      });
      vi.mocked(mockUserRepository.findById).mockResolvedValue(null);

      await expect(
        useCase.execute({ refreshToken: validRefreshToken }),
      ).rejects.toThrow(InvalidCredentialsError);
    });

    it('should not sign new tokens when user is not found', async () => {
      vi.mocked(mockJwtService.verifyRefreshToken).mockResolvedValue({
        userId: 'deleted-user-id',
        email: 'deleted@example.com',
      });
      vi.mocked(mockUserRepository.findById).mockResolvedValue(null);

      await expect(
        useCase.execute({ refreshToken: validRefreshToken }),
      ).rejects.toThrow(InvalidCredentialsError);

      expect(mockJwtService.signTokens).not.toHaveBeenCalled();
    });
  });

  describe('constructor', () => {
    it('should accept UserRepository and JwtService dependencies', () => {
      const instance = new RefreshTokenUseCase({
        userRepository: mockUserRepository,
        jwtService: mockJwtService,
      });

      expect(instance).toBeInstanceOf(RefreshTokenUseCase);
    });
  });
});
