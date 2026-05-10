/**
 * RefreshTokenUseCase
 *
 * Application use case that exchanges a valid refresh token for a new token pair.
 *
 * Flow:
 * 1. Verify the refresh token signature and expiry → if invalid, throw InvalidCredentialsError
 * 2. Find user by id extracted from the token → if not found, throw InvalidCredentialsError
 * 3. Sign and return a new access/refresh token pair
 *
 * HU-038: Authentication use case for token refresh.
 */

import type { UserRepository } from '../../../domain/user/ports/UserRepository.js';
import type { JwtService, TokenPair } from '../../../domain/user/ports/JwtService.js';
import { InvalidCredentialsError } from '../../../domain/user/errors/UserErrors.js';

/**
 * Input DTO for the refresh token use case
 */
export interface RefreshTokenInput {
  refreshToken: string;
}

/**
 * Dependencies required by RefreshTokenUseCase
 */
export interface RefreshTokenUseCaseDeps {
  userRepository: UserRepository;
  jwtService: JwtService;
}

/**
 * RefreshTokenUseCase
 *
 * Validates a refresh token and issues a fresh token pair.
 * Throws InvalidCredentialsError for any invalid or expired token.
 */
export class RefreshTokenUseCase {
  private readonly userRepository: UserRepository;
  private readonly jwtService: JwtService;

  constructor(deps: RefreshTokenUseCaseDeps) {
    this.userRepository = deps.userRepository;
    this.jwtService = deps.jwtService;
  }

  /**
   * Executes the refresh token use case
   *
   * @param input - The refresh token to validate
   * @returns Promise resolving to a new signed access/refresh token pair
   * @throws InvalidCredentialsError if the token is invalid, expired, or the user no longer exists
   */
  async execute(input: RefreshTokenInput): Promise<TokenPair> {
    // 1. Verify refresh token
    let payload: { userId: string; email: string };
    try {
      payload = await this.jwtService.verifyRefreshToken(input.refreshToken);
    } catch {
      throw new InvalidCredentialsError();
    }

    // 2. Find user by id from token payload
    const user = await this.userRepository.findById(payload.userId);
    if (!user) {
      throw new InvalidCredentialsError();
    }

    // 3. Sign and return a new token pair
    return this.jwtService.signTokens(user.id.value, user.email.value);
  }
}
