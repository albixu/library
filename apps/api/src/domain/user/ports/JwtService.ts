/**
 * JwtService Port (Driven/Output Port)
 *
 * Defines the contract for JWT token operations.
 * This is a pure domain port — no infrastructure dependencies.
 *
 * HU-038: Authentication domain port for JWT signing and verification.
 */

/**
 * A pair of access and refresh tokens
 */
export interface TokenPair {
  /** Short-lived token for API authentication */
  accessToken: string;
  /** Long-lived token used to obtain a new access token */
  refreshToken: string;
}

/**
 * JwtService Port Interface
 *
 * Provides operations for signing and verifying JWT tokens.
 */
export interface JwtService {
  /**
   * Signs and returns a new access/refresh token pair for the given user
   *
   * @param userId - The user UUID to embed in the token payload
   * @param email - The user email to embed in the token payload
   * @returns Promise resolving to the signed token pair
   */
  signTokens(userId: string, email: string): Promise<TokenPair>;

  /**
   * Verifies and decodes an access token
   *
   * @param token - The access token to verify
   * @returns Promise resolving to the decoded payload (userId and email)
   * @throws If the token is invalid, expired, or tampered with
   */
  verifyAccessToken(token: string): Promise<{ userId: string; email: string }>;

  /**
   * Verifies and decodes a refresh token
   *
   * @param token - The refresh token to verify
   * @returns Promise resolving to the decoded payload (userId and email)
   * @throws If the token is invalid, expired, or tampered with
   */
  verifyRefreshToken(token: string): Promise<{ userId: string; email: string }>;
}
