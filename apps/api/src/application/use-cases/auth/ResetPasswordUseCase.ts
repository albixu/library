/**
 * ResetPasswordUseCase
 *
 * Application use case that validates a password reset token and updates the user's password.
 *
 * Flow:
 * 1. Hash the received plain token with SHA-256
 * 2. Find the token by its hash → if not found or already used, throw PasswordResetTokenInvalidError
 * 3. Verify the token is not expired → if expired, throw PasswordResetTokenExpiredError
 * 4. Hash the new password with PasswordHasher
 * 5. Update the user's password via UserRepository
 * 6. Mark the token as used to prevent reuse
 *
 * HU-038: Authentication use case for completing the password reset flow.
 */

import { createHash } from 'crypto';
import type { PasswordResetTokenRepository } from '../../../domain/user/ports/PasswordResetTokenRepository.js';
import type { UserRepository } from '../../../domain/user/ports/UserRepository.js';
import type { PasswordHasher } from '../../../domain/user/ports/PasswordHasher.js';
import {
  PasswordResetTokenInvalidError,
  PasswordResetTokenExpiredError,
} from '../../../domain/user/errors/UserErrors.js';

/**
 * Input DTO for the reset password use case
 */
export interface ResetPasswordInput {
  token: string;
  newPassword: string;
}

/**
 * Dependencies required by ResetPasswordUseCase
 */
export interface ResetPasswordUseCaseDeps {
  tokenRepository: PasswordResetTokenRepository;
  userRepository: UserRepository;
  passwordHasher: PasswordHasher;
}

/**
 * ResetPasswordUseCase
 *
 * Validates a reset token and updates the user's password.
 */
export class ResetPasswordUseCase {
  private readonly tokenRepository: PasswordResetTokenRepository;
  private readonly userRepository: UserRepository;
  private readonly passwordHasher: PasswordHasher;

  constructor(deps: ResetPasswordUseCaseDeps) {
    this.tokenRepository = deps.tokenRepository;
    this.userRepository = deps.userRepository;
    this.passwordHasher = deps.passwordHasher;
  }

  /**
   * Executes the reset password use case
   *
   * @param input - The plain token from the reset link and the new password
   * @returns Promise resolving to void on success
   * @throws PasswordResetTokenInvalidError if the token does not exist or has already been used
   * @throws PasswordResetTokenExpiredError if the token has expired
   */
  async execute(input: ResetPasswordInput): Promise<void> {
    // 1. Hash the plain token to look it up in the repository
    const tokenHash = createHash('sha256').update(input.token).digest('hex');

    // 2. Find the token by its hash — repository returns null for used/invalid tokens
    const tokenRecord = await this.tokenRepository.findValidByTokenHash(tokenHash);
    if (!tokenRecord) {
      throw new PasswordResetTokenInvalidError();
    }

    // 3. Verify the token has not expired
    if (tokenRecord.expiresAt < new Date()) {
      throw new PasswordResetTokenExpiredError();
    }

    // 4. Hash the new password
    const newPasswordHash = await this.passwordHasher.hash(input.newPassword);

    // 5. Update the user's password
    await this.userRepository.updatePassword(tokenRecord.userId, newPasswordHash);

    // 6. Mark the token as used to prevent reuse
    await this.tokenRepository.markAsUsed(tokenRecord.id);
  }
}
