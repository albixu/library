/**
 * Unit Tests: LoginUseCase
 *
 * Tests for the use case that validates credentials and returns a token pair.
 * HU-038: JWT-based authentication.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoginUseCase } from '../../../../../src/application/use-cases/auth/LoginUseCase.js';
import { User } from '../../../../../src/domain/user/User.js';
import { InvalidCredentialsError } from '../../../../../src/domain/user/errors/UserErrors.js';
import type { UserRepository } from '../../../../../src/domain/user/ports/UserRepository.js';
import type { PasswordHasher } from '../../../../../src/domain/user/ports/PasswordHasher.js';
import type { JwtService } from '../../../../../src/domain/user/ports/JwtService.js';

describe('LoginUseCase', () => {
  let mockUserRepository: UserRepository;
  let mockPasswordHasher: PasswordHasher;
  let mockJwtService: JwtService;
  let useCase: LoginUseCase;

  const fakeUser = User.fromPersistence({
    id: '550e8400-e29b-41d4-a716-446655440001',
    email: 'user@example.com',
    passwordHash: '$2b$10$hashedpassword',
    createdAt: new Date('2026-01-01T00:00:00Z'),
  });

  const fakeTokenPair = {
    accessToken: 'access.token.here',
    refreshToken: 'refresh.token.here',
  };

  beforeEach(() => {
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

    mockJwtService = {
      signTokens: vi.fn(),
      verifyAccessToken: vi.fn(),
      verifyRefreshToken: vi.fn(),
    };

    useCase = new LoginUseCase({
      userRepository: mockUserRepository,
      passwordHasher: mockPasswordHasher,
      jwtService: mockJwtService,
    });
  });

  describe('execute — happy path', () => {
    it('should return a token pair when credentials are valid', async () => {
      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(fakeUser);
      vi.mocked(mockPasswordHasher.verify).mockResolvedValue(true);
      vi.mocked(mockJwtService.signTokens).mockResolvedValue(fakeTokenPair);

      const result = await useCase.execute({ email: 'user@example.com', password: 'secret123' });

      expect(result).toEqual(fakeTokenPair);
    });

    it('should call findByEmail with the provided email', async () => {
      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(fakeUser);
      vi.mocked(mockPasswordHasher.verify).mockResolvedValue(true);
      vi.mocked(mockJwtService.signTokens).mockResolvedValue(fakeTokenPair);

      await useCase.execute({ email: 'user@example.com', password: 'secret123' });

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('user@example.com');
    });

    it('should verify the password against the stored hash', async () => {
      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(fakeUser);
      vi.mocked(mockPasswordHasher.verify).mockResolvedValue(true);
      vi.mocked(mockJwtService.signTokens).mockResolvedValue(fakeTokenPair);

      await useCase.execute({ email: 'user@example.com', password: 'secret123' });

      expect(mockPasswordHasher.verify).toHaveBeenCalledWith('secret123', fakeUser.passwordHash);
    });

    it('should sign tokens with the user id and email', async () => {
      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(fakeUser);
      vi.mocked(mockPasswordHasher.verify).mockResolvedValue(true);
      vi.mocked(mockJwtService.signTokens).mockResolvedValue(fakeTokenPair);

      await useCase.execute({ email: 'user@example.com', password: 'secret123' });

      expect(mockJwtService.signTokens).toHaveBeenCalledWith(
        fakeUser.id.value,
        fakeUser.email.value,
      );
    });
  });

  describe('execute — user not found', () => {
    it('should throw InvalidCredentialsError when user does not exist', async () => {
      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(null);

      await expect(
        useCase.execute({ email: 'unknown@example.com', password: 'secret123' }),
      ).rejects.toThrow(InvalidCredentialsError);
    });

    it('should not call passwordHasher when user is not found', async () => {
      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(null);

      await expect(
        useCase.execute({ email: 'unknown@example.com', password: 'secret123' }),
      ).rejects.toThrow(InvalidCredentialsError);

      expect(mockPasswordHasher.verify).not.toHaveBeenCalled();
    });
  });

  describe('execute — wrong password', () => {
    it('should throw InvalidCredentialsError when password does not match', async () => {
      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(fakeUser);
      vi.mocked(mockPasswordHasher.verify).mockResolvedValue(false);

      await expect(
        useCase.execute({ email: 'user@example.com', password: 'wrongpassword' }),
      ).rejects.toThrow(InvalidCredentialsError);
    });

    it('should not call signTokens when password is wrong', async () => {
      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(fakeUser);
      vi.mocked(mockPasswordHasher.verify).mockResolvedValue(false);

      await expect(
        useCase.execute({ email: 'user@example.com', password: 'wrongpassword' }),
      ).rejects.toThrow(InvalidCredentialsError);

      expect(mockJwtService.signTokens).not.toHaveBeenCalled();
    });
  });

  describe('constructor', () => {
    it('should accept the required dependencies', () => {
      const instance = new LoginUseCase({
        userRepository: mockUserRepository,
        passwordHasher: mockPasswordHasher,
        jwtService: mockJwtService,
      });

      expect(instance).toBeInstanceOf(LoginUseCase);
    });
  });
});
