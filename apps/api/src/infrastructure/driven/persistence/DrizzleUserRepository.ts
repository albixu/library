/**
 * DrizzleUserRepository Adapter
 *
 * Implements the UserRepository port using Drizzle ORM with PostgreSQL.
 * This is a driven/output adapter in the hexagonal architecture.
 *
 * HU-038: Persistence adapter for User entity.
 */

import { eq } from 'drizzle-orm';
import type { UserRepository } from '../../../domain/user/ports/UserRepository.js';
import type { User } from '../../../domain/user/User.js';
import { User as UserEntity } from '../../../domain/user/User.js';
import { users, type UserSelect } from './drizzle/schema.js';
import type { DatabaseClient } from './types.js';

/**
 * Maps a Drizzle UserSelect row to a User domain entity
 */
function toDomain(row: UserSelect): User {
  return UserEntity.fromPersistence({
    id: row.id,
    email: row.email,
    passwordHash: row.passwordHash,
    createdAt: row.createdAt ?? new Date(),
  });
}

/**
 * DrizzleUserRepository
 *
 * Adapter that implements UserRepository using Drizzle ORM.
 */
export class DrizzleUserRepository implements UserRepository {
  constructor(private readonly db: DatabaseClient) {}

  /**
   * Finds a user by email address
   */
  async findByEmail(email: string): Promise<User | null> {
    const row = await this.db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    return row ? toDomain(row) : null;
  }

  /**
   * Finds a user by unique identifier
   */
  async findById(id: string): Promise<User | null> {
    const row = await this.db.query.users.findFirst({
      where: eq(users.id, id),
    });

    return row ? toDomain(row) : null;
  }

  /**
   * Persists a new user
   */
  async save(user: User): Promise<void> {
    await this.db.insert(users).values({
      id: user.id.value,
      email: user.email.value,
      passwordHash: user.passwordHash,
      createdAt: user.createdAt,
    });
  }

  /**
   * Updates only the password hash for a given user
   */
  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.db
      .update(users)
      .set({ passwordHash })
      .where(eq(users.id, userId));
  }
}
