/**
 * LoginUseCase
 *
 * Application use case that orchestrates the user login flow.
 *
 * Flow:
 * 1. Find user by email → if not found, throw InvalidCredentialsError
 * 2. Verify password against stored hash → if mismatch, throw InvalidCredentialsError
 * 3. Sign and return a new access/refresh token pair
 *
 * HU-038: Authentication use case for user login.
 */

import type { UserRepository } from '../../../domain/user/ports/UserRepository.js';
import type { PasswordHasher } from '../../../domain/user/ports/PasswordHasher.js';
import type { JwtService, TokenPair } from '../../../domain/user/ports/JwtService.js';
import { InvalidCredentialsError } from '../../../domain/user/errors/UserErrors.js';

/**
 * Input DTO for the login use case
 */
export interface LoginInput {
  email: string;
  password: string;
}

/**
 * Dependencies required by LoginUseCase
 */
export interface LoginUseCaseDeps {
  userRepository: UserRepository;
  passwordHasher: PasswordHasher;
  jwtService: JwtService;
}

/**
 * LoginUseCase
 *
 * Validates user credentials and returns a signed token pair on success.
 * Uses intentionally vague error messages to prevent user enumeration attacks.
 */
export class LoginUseCase {
  private readonly userRepository: UserRepository;
  private readonly passwordHasher: PasswordHasher;
  private readonly jwtService: JwtService;

  constructor(deps: LoginUseCaseDeps) {
    this.userRepository = deps.userRepository;
    this.passwordHasher = deps.passwordHasher;
    this.jwtService = deps.jwtService;
  }

  /**
   * Executes the login use case
   *
   * @param input - The login credentials (email and plain-text password)
   * @returns Promise resolving to a signed access/refresh token pair
   * @throws InvalidCredentialsError if email or password is incorrect
   */
  async execute(input: LoginInput): Promise<TokenPair> {
    // 1. Find user by email
    const user = await this.userRepository.findByEmail(input.email);
    if (!user) {
      throw new InvalidCredentialsError();
    }

    // 2. Verify password
    const isPasswordValid = await this.passwordHasher.verify(input.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new InvalidCredentialsError();
    }

    // 3. Sign and return token pair
    return this.jwtService.signTokens(user.id.value, user.email.value);
  }
}
