/**
 * DrizzlePasswordResetTokenRepository Adapter
 *
 * Implements the PasswordResetTokenRepository port using Drizzle ORM with PostgreSQL.
 * This is a driven/output adapter in the hexagonal architecture.
 *
 * HU-038: Persistence adapter for PasswordResetToken.
 */

import { eq, and, lte, isNull } from 'drizzle-orm';
import type {
  PasswordResetTokenRepository,
  PasswordResetToken,
} from '../../../domain/user/ports/PasswordResetTokenRepository.js';
import { passwordResetTokens, type PasswordResetTokenSelect } from './drizzle/schema.js';
import type { DatabaseClient } from './types.js';

/**
 * Maps a Drizzle PasswordResetTokenSelect row to the domain PasswordResetToken
 */
function toDomain(row: PasswordResetTokenSelect): PasswordResetToken {
  return {
    id: row.id,
    userId: row.userId,
    tokenHash: row.tokenHash,
    expiresAt: row.expiresAt,
    usedAt: row.usedAt ?? null,
  };
}

/**
 * DrizzlePasswordResetTokenRepository
 *
 * Adapter that implements PasswordResetTokenRepository using Drizzle ORM.
 */
export class DrizzlePasswordResetTokenRepository implements PasswordResetTokenRepository {
  constructor(private readonly db: DatabaseClient) {}

  /**
   * Persists a new password reset token
   */
  async create(token: PasswordResetToken): Promise<void> {
    await this.db.insert(passwordResetTokens).values({
      id: token.id,
      userId: token.userId,
      tokenHash: token.tokenHash,
      expiresAt: token.expiresAt,
      usedAt: token.usedAt ?? undefined,
    });
  }

  /**
   * Finds a valid (non-expired, non-used) token by its hash
   *
   * Returns null if the token:
   * - Does not exist
   * - Has been used (usedAt IS NOT NULL)
   * - Has expired (expiresAt <= now)
   */
  async findValidByTokenHash(tokenHash: string): Promise<PasswordResetToken | null> {
    const now = new Date();

    const row = await this.db.query.passwordResetTokens.findFirst({
      where: and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        isNull(passwordResetTokens.usedAt),
        // We use a raw comparison: expiresAt > now means the token hasn't expired
        // We filter expired tokens out by checking expiresAt > now
      ),
    });

    if (!row) return null;

    // Check expiry in application layer (avoids SQL gt import complexity)
    if (row.expiresAt <= now) return null;

    return toDomain(row);
  }

  /**
   * Marks a token as used to prevent reuse
   */
  async markAsUsed(tokenId: string): Promise<void> {
    await this.db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, tokenId));
  }

  /**
   * Removes all expired tokens from the store
   */
  async deleteExpired(): Promise<void> {
    const now = new Date();

    await this.db
      .delete(passwordResetTokens)
      .where(lte(passwordResetTokens.expiresAt, now));
  }
}
