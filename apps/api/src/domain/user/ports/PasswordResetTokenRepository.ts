/**
 * PasswordResetTokenRepository Port (Driven/Output Port)
 *
 * Defines the contract for password reset token persistence operations.
 * This is a pure domain port — no infrastructure dependencies.
 *
 * HU-038: Authentication domain port for password reset token management.
 */

/**
 * Represents a password reset token persisted in the system
 */
export interface PasswordResetToken {
  /** Unique identifier for this token record */
  id: string;
  /** The user this token belongs to */
  userId: string;
  /** Hashed version of the raw token (never store the raw token) */
  tokenHash: string;
  /** When this token expires and can no longer be used */
  expiresAt: Date;
  /** When this token was used; null if not yet used */
  usedAt: Date | null;
}

/**
 * PasswordResetTokenRepository Port Interface
 *
 * Provides operations for managing password reset tokens.
 */
export interface PasswordResetTokenRepository {
  /**
   * Persists a new password reset token
   *
   * @param token - The token record to create
   */
  create(token: PasswordResetToken): Promise<void>;

  /**
   * Finds a valid (non-expired, non-used) token by its hash
   *
   * @param tokenHash - The hashed token to search for
   * @returns Promise resolving to the token if found and valid, null otherwise
   */
  findValidByTokenHash(tokenHash: string): Promise<PasswordResetToken | null>;

  /**
   * Marks a token as used to prevent reuse
   *
   * @param tokenId - The token UUID to mark as used
   */
  markAsUsed(tokenId: string): Promise<void>;

  /**
   * Removes all expired tokens from the store
   */
  deleteExpired(): Promise<void>;
}
