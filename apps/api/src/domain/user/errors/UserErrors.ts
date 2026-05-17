/**
 * User Domain Errors
 *
 * Specific error classes for authentication and user management.
 * All errors extend DomainError for consistent handling at the application layer.
 */

import { DomainError } from '../../errors/DomainErrors.js';

/**
 * Thrown when login credentials (email/password) are invalid.
 * Intentionally vague to avoid user enumeration attacks.
 */
export class InvalidCredentialsError extends DomainError {
  constructor() {
    super('Invalid email or password.');
  }
}

/**
 * Thrown when trying to register a user with an email that already exists.
 */
export class UserAlreadyExistsError extends DomainError {
  constructor(email: string) {
    super(`A user with email "${email}" already exists.`);
  }
}

/**
 * Thrown when a password reset token has expired.
 */
export class PasswordResetTokenExpiredError extends DomainError {
  constructor() {
    super('The password reset token has expired. Please request a new one.');
  }
}

/**
 * Thrown when a password reset token is invalid or not found.
 */
export class PasswordResetTokenInvalidError extends DomainError {
  constructor() {
    super('The password reset token is invalid or does not exist.');
  }
}
