/**
 * User Entity
 *
 * Represents an authenticated user of the digital library system.
 *
 * Entities are:
 * - Identified by a unique ID (UserId)
 * - Immutable (all state is set at construction time)
 * - Responsible for maintaining their own invariants
 *
 * HU-038: Core User entity for JWT-based authentication.
 */

import { UserId } from './value-objects/UserId.js';
import { EmailAddress } from '../value-objects/EmailAddress.js';

export interface CreateUserProps {
  email: string;
  passwordHash: string;
}

export interface UserPersistenceProps {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

export class User {
  private constructor(
    public readonly id: UserId,
    public readonly email: EmailAddress,
    public readonly passwordHash: string,
    public readonly createdAt: Date,
  ) {
    Object.freeze(this);
  }

  /**
   * Creates a new User with a generated id and current timestamp.
   * Use this when registering a new user.
   * @throws InvalidEmailAddressError if the email is invalid
   */
  static create(props: CreateUserProps): User {
    const id = UserId.generate();
    const email = EmailAddress.create(props.email);
    const createdAt = new Date();

    return new User(id, email, props.passwordHash, createdAt);
  }

  /**
   * Reconstructs a User from persistence data without re-validation.
   * Use this when loading a user from the database.
   */
  static fromPersistence(props: UserPersistenceProps): User {
    const id = UserId.fromPersistence(props.id);
    const email = EmailAddress.fromPersistence(props.email);

    return new User(id, email, props.passwordHash, props.createdAt);
  }

  /**
   * Compares two User instances by id.
   */
  equals(other: User): boolean {
    return this.id.equals(other.id);
  }
}
