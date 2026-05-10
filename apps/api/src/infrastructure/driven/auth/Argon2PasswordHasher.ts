/**
 * Argon2PasswordHasher Adapter
 *
 * Implements the PasswordHasher port using the argon2 library.
 * Argon2id is the recommended variant for password hashing (OWASP).
 *
 * HU-038: Infrastructure adapter for secure password hashing.
 */

import argon2 from 'argon2';
import type { PasswordHasher } from '../../../domain/user/ports/PasswordHasher.js';

/**
 * Argon2PasswordHasher
 *
 * Uses argon2id variant for maximum security.
 * Default options from the argon2 library are already OWASP-compliant.
 */
export class Argon2PasswordHasher implements PasswordHasher {
  /**
   * Hashes a plain-text password using Argon2id
   *
   * @param plainPassword - The plain-text password to hash
   * @returns The hashed password string (includes salt and parameters)
   */
  async hash(plainPassword: string): Promise<string> {
    return argon2.hash(plainPassword, {
      type: argon2.argon2id,
    });
  }

  /**
   * Verifies a plain-text password against an Argon2 hash
   *
   * @param plainPassword - The plain-text password to verify
   * @param hash - The stored Argon2 hash to compare against
   * @returns true if the password matches, false otherwise
   */
  async verify(plainPassword: string, hash: string): Promise<boolean> {
    return argon2.verify(hash, plainPassword);
  }
}
