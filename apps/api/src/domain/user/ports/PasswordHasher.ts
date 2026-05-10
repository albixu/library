/**
 * PasswordHasher Port (Driven/Output Port)
 *
 * Defines the contract for password hashing operations.
 * This is a pure domain port — no infrastructure dependencies.
 *
 * HU-038: Authentication domain port for password hashing and verification.
 */

/**
 * PasswordHasher Port Interface
 *
 * Provides operations for hashing and verifying passwords securely.
 */
export interface PasswordHasher {
  /**
   * Hashes a plain-text password
   *
   * @param plainPassword - The plain-text password to hash
   * @returns Promise resolving to the hashed password string
   */
  hash(plainPassword: string): Promise<string>;

  /**
   * Verifies a plain-text password against a stored hash
   *
   * @param plainPassword - The plain-text password to verify
   * @param hash - The stored password hash to compare against
   * @returns Promise resolving to true if the password matches, false otherwise
   */
  verify(plainPassword: string, hash: string): Promise<boolean>;
}
