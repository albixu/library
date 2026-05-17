/**
 * DrizzlePasswordResetTokenRepository Integration Tests
 *
 * Tests the PasswordResetTokenRepository adapter against a real PostgreSQL database.
 * Requires Docker containers to be running: docker-compose up -d
 *
 * Run with: npm run test:integration
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { DrizzlePasswordResetTokenRepository } from '../../../../src/infrastructure/driven/persistence/DrizzlePasswordResetTokenRepository.js';
import { DrizzleUserRepository } from '../../../../src/infrastructure/driven/persistence/DrizzleUserRepository.js';
import { User } from '../../../../src/domain/user/User.js';
import type { PasswordResetToken } from '../../../../src/domain/user/ports/PasswordResetTokenRepository.js';
import * as schema from '../../../../src/infrastructure/driven/persistence/drizzle/schema.js';
import { generateUUID } from '../../../../src/shared/utils/uuid.js';

const { Pool } = pg;
const { users, passwordResetTokens } = schema;

describe('DrizzlePasswordResetTokenRepository Integration', () => {
  let pool: pg.Pool;
  let db: ReturnType<typeof drizzle>;
  let repository: DrizzlePasswordResetTokenRepository;
  let userRepository: DrizzleUserRepository;
  let testUser: User;

  beforeAll(async () => {
    const databaseUrl = process.env['DATABASE_URL'] ?? 'postgresql://library:library@localhost:5432/library';

    pool = new Pool({ connectionString: databaseUrl, max: 5 });

    const client = await pool.connect();
    client.release();

    db = drizzle(pool, { schema });
    repository = new DrizzlePasswordResetTokenRepository(db as any);
    userRepository = new DrizzleUserRepository(db as any);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await db.delete(passwordResetTokens);
    await db.delete(users);

    // Create a test user to attach tokens to
    testUser = User.create({ email: 'token-owner@example.com', passwordHash: 'hash' });
    await userRepository.save(testUser);
  });

  function makeToken(overrides: Partial<PasswordResetToken> = {}): PasswordResetToken {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h from now
    return {
      id: generateUUID(),
      userId: testUser.id.value,
      tokenHash: `hash-${generateUUID()}`,
      expiresAt: future,
      usedAt: null,
      ...overrides,
    };
  }

  describe('create', () => {
    it('should persist a new password reset token', async () => {
      const token = makeToken();

      await repository.create(token);

      const found = await repository.findValidByTokenHash(token.tokenHash);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(token.id);
      expect(found!.userId).toBe(testUser.id.value);
    });
  });

  describe('findValidByTokenHash', () => {
    it('should return a valid token', async () => {
      const token = makeToken();
      await repository.create(token);

      const found = await repository.findValidByTokenHash(token.tokenHash);

      expect(found).not.toBeNull();
      expect(found!.tokenHash).toBe(token.tokenHash);
    });

    it('should return null when token does not exist', async () => {
      const found = await repository.findValidByTokenHash('nonexistent-hash');
      expect(found).toBeNull();
    });

    it('should return null when token has been used', async () => {
      const token = makeToken();
      await repository.create(token);
      await repository.markAsUsed(token.id);

      const found = await repository.findValidByTokenHash(token.tokenHash);
      expect(found).toBeNull();
    });

    it('should return null when token has expired', async () => {
      const past = new Date(Date.now() - 1000); // 1 second ago
      const token = makeToken({ expiresAt: past });
      await repository.create(token);

      const found = await repository.findValidByTokenHash(token.tokenHash);
      expect(found).toBeNull();
    });
  });

  describe('markAsUsed', () => {
    it('should mark a token as used so it cannot be retrieved again', async () => {
      const token = makeToken();
      await repository.create(token);

      await repository.markAsUsed(token.id);

      const found = await repository.findValidByTokenHash(token.tokenHash);
      expect(found).toBeNull();
    });
  });

  describe('deleteExpired', () => {
    it('should delete expired tokens and keep valid ones', async () => {
      const past = new Date(Date.now() - 60 * 1000); // 1 minute ago
      const expiredToken = makeToken({ expiresAt: past });
      const validToken = makeToken(); // expiresAt 24h from now (default)

      await repository.create(expiredToken);
      await repository.create(validToken);

      await repository.deleteExpired();

      const rows = await db.select().from(passwordResetTokens);
      expect(rows).toHaveLength(1);
      expect(rows[0]!.id).toBe(validToken.id);
    });
  });
});
