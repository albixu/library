/**
 * ForgotPasswordUseCase
 *
 * Application use case that initiates the password reset flow.
 *
 * Flow:
 * 1. Find user by email → if not found, return void silently (prevent user enumeration)
 * 2. Generate a cryptographically secure random token
 * 3. Hash the token with SHA-256
 * 4. Persist the token record with 24h expiry
 * 5. Send an email with the reset link containing the plain token
 *
 * HU-038: Authentication use case for initiating password reset.
 */

import { randomBytes, createHash } from 'crypto';
import { randomUUID } from 'crypto';
import type { UserRepository } from '../../../domain/user/ports/UserRepository.js';
import type { PasswordResetTokenRepository } from '../../../domain/user/ports/PasswordResetTokenRepository.js';
import type { EmailPort } from '../../ports/EmailPort.js';

/** Token expiry in milliseconds (24 hours) */
const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000;

/**
 * Input DTO for the forgot password use case
 */
export interface ForgotPasswordInput {
  email: string;
}

/**
 * Dependencies required by ForgotPasswordUseCase
 */
export interface ForgotPasswordUseCaseDeps {
  userRepository: UserRepository;
  tokenRepository: PasswordResetTokenRepository;
  emailPort: EmailPort;
  appBaseUrl: string;
}

/**
 * ForgotPasswordUseCase
 *
 * Generates a password reset token and sends the reset link via email.
 * Returns void silently even when the email does not exist to prevent user enumeration.
 */
export class ForgotPasswordUseCase {
  private readonly userRepository: UserRepository;
  private readonly tokenRepository: PasswordResetTokenRepository;
  private readonly emailPort: EmailPort;
  private readonly appBaseUrl: string;

  constructor(deps: ForgotPasswordUseCaseDeps) {
    this.userRepository = deps.userRepository;
    this.tokenRepository = deps.tokenRepository;
    this.emailPort = deps.emailPort;
    this.appBaseUrl = deps.appBaseUrl;
  }

  /**
   * Executes the forgot password use case
   *
   * @param input - The email address requesting the password reset
   * @returns Promise resolving to void (always, regardless of whether user exists)
   */
  async execute(input: ForgotPasswordInput): Promise<void> {
    // 1. Find user by email — return silently if not found (prevent user enumeration)
    const user = await this.userRepository.findByEmail(input.email);
    if (!user) {
      return;
    }

    // 2. Generate a cryptographically secure random token (32 bytes = 64 hex chars)
    const plainToken = randomBytes(32).toString('hex');

    // 3. Hash the token with SHA-256 (only the hash is stored)
    const tokenHash = createHash('sha256').update(plainToken).digest('hex');

    // 4. Persist the token record with 24h expiry
    await this.tokenRepository.create({
      id: randomUUID(),
      userId: user.id.value,
      tokenHash,
      expiresAt: new Date(Date.now() + TOKEN_EXPIRY_MS),
      usedAt: null,
    });

    // 5. Send the reset link via email (plain token is in the URL, hash stays in DB)
    const resetLink = `${this.appBaseUrl}/reset-password?token=${plainToken}`;
    await this.emailPort.send({
      to: user.email.value,
      subject: 'Password Reset Request',
      body: `You requested a password reset. Click the link below to set a new password:\n\n${resetLink}\n\nThis link expires in 24 hours. If you did not request this, please ignore this email.`,
    });
  }
}
