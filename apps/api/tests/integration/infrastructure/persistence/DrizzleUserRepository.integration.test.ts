/**
 * DrizzleUserRepository Integration Tests
 *
 * Tests the UserRepository adapter against a real PostgreSQL database.
 * Requires Docker containers to be running: docker-compose up -d
 *
 * Run with: npm run test:integration
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { DrizzleUserRepository } from '../../../../src/infrastructure/driven/persistence/DrizzleUserRepository.js';
import { User } from '../../../../src/domain/user/User.js';
import * as schema from '../../../../src/infrastructure/driven/persistence/drizzle/schema.js';

const { Pool } = pg;
const { users, passwordResetTokens } = schema;

describe('DrizzleUserRepository Integration', () => {
  let pool: pg.Pool;
  let db: ReturnType<typeof drizzle>;
  let repository: DrizzleUserRepository;

  beforeAll(async () => {
    const databaseUrl = process.env['DATABASE_URL'] ?? 'postgresql://library:library@localhost:5432/library';

    pool = new Pool({ connectionString: databaseUrl, max: 5 });

    const client = await pool.connect();
    client.release();

    db = drizzle(pool, { schema });
    repository = new DrizzleUserRepository(db as any);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    // Clean up test data — FK order matters
    await db.delete(passwordResetTokens);
    await db.delete(users);
  });

  describe('save', () => {
    it('should persist a new user', async () => {
      const user = User.create({
        email: 'alice@example.com',
        passwordHash: '$argon2id$v=19$test-hash',
      });

      await repository.save(user);

      const found = await repository.findById(user.id.value);
      expect(found).not.toBeNull();
      expect(found!.email.value).toBe('alice@example.com');
      expect(found!.passwordHash).toBe('$argon2id$v=19$test-hash');
    });
  });

  describe('findByEmail', () => {
    it('should return a user when found by email', async () => {
      const user = User.create({ email: 'bob@example.com', passwordHash: 'hash123' });
      await repository.save(user);

      const found = await repository.findByEmail('bob@example.com');

      expect(found).not.toBeNull();
      expect(found!.id.value).toBe(user.id.value);
    });

    it('should return null when email does not exist', async () => {
      const found = await repository.findByEmail('nonexistent@example.com');
      expect(found).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return a user when found by id', async () => {
      const user = User.create({ email: 'carol@example.com', passwordHash: 'hash456' });
      await repository.save(user);

      const found = await repository.findById(user.id.value);

      expect(found).not.toBeNull();
      expect(found!.email.value).toBe('carol@example.com');
    });

    it('should return null when id does not exist', async () => {
      const found = await repository.findById('00000000-0000-0000-0000-000000000000');
      expect(found).toBeNull();
    });
  });

  describe('updatePassword', () => {
    it('should update the password hash for an existing user', async () => {
      const user = User.create({ email: 'dave@example.com', passwordHash: 'old-hash' });
      await repository.save(user);

      await repository.updatePassword(user.id.value, 'new-hash-updated');

      const found = await repository.findById(user.id.value);
      expect(found!.passwordHash).toBe('new-hash-updated');
    });
  });
});
