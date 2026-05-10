/**
 * AuthController
 *
 * HTTP request handlers for authentication endpoints.
 * Follows the thin controller pattern — delegates business logic to use cases.
 *
 * Cookies:
 * - access_token:  httpOnly, Secure, SameSite=Strict, maxAge 7 days
 * - refresh_token: httpOnly, Secure, SameSite=Strict, maxAge 30 days
 *
 * HU-038: Authentication HTTP controller.
 */

import type { FastifyReply, FastifyRequest } from 'fastify';
import type { LoginUseCase } from '../../../../application/use-cases/auth/LoginUseCase.js';
import type { LogoutUseCase } from '../../../../application/use-cases/auth/LogoutUseCase.js';
import type { RefreshTokenUseCase } from '../../../../application/use-cases/auth/RefreshTokenUseCase.js';
import type { ForgotPasswordUseCase } from '../../../../application/use-cases/auth/ForgotPasswordUseCase.js';
import type { ResetPasswordUseCase } from '../../../../application/use-cases/auth/ResetPasswordUseCase.js';
import type { Logger } from '../../../../application/ports/Logger.js';
import { noopLogger } from '../../../../application/ports/Logger.js';
import {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../schemas/auth.schemas.js';
import { successResponse } from '../schemas/common.schemas.js';
import { mapErrorToHttpResponse } from '../errors/HttpErrorMapper.js';

/** Cookie name constants */
const COOKIE_ACCESS_TOKEN = 'access_token';
const COOKIE_REFRESH_TOKEN = 'refresh_token';

/** Cookie max-age values in seconds */
const ACCESS_TOKEN_MAX_AGE_SEC = 7 * 24 * 60 * 60;   // 7 days
const REFRESH_TOKEN_MAX_AGE_SEC = 30 * 24 * 60 * 60;  // 30 days

/**
 * Shared cookie options for both tokens
 */
const baseCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'strict' as const,
  path: '/',
};

/**
 * Dependencies required by AuthController
 */
export interface AuthControllerDeps {
  loginUseCase: LoginUseCase;
  logoutUseCase: LogoutUseCase;
  refreshTokenUseCase: RefreshTokenUseCase;
  forgotPasswordUseCase: ForgotPasswordUseCase;
  resetPasswordUseCase: ResetPasswordUseCase;
  logger?: Logger;
}

/**
 * AuthController
 *
 * Handles HTTP requests for authentication operations.
 */
export class AuthController {
  private readonly loginUseCase: LoginUseCase;
  private readonly logoutUseCase: LogoutUseCase;
  private readonly refreshTokenUseCase: RefreshTokenUseCase;
  private readonly forgotPasswordUseCase: ForgotPasswordUseCase;
  private readonly resetPasswordUseCase: ResetPasswordUseCase;
  private readonly logger: Logger;

  constructor(deps: AuthControllerDeps) {
    this.loginUseCase = deps.loginUseCase;
    this.logoutUseCase = deps.logoutUseCase;
    this.refreshTokenUseCase = deps.refreshTokenUseCase;
    this.forgotPasswordUseCase = deps.forgotPasswordUseCase;
    this.resetPasswordUseCase = deps.resetPasswordUseCase;
    this.logger = deps.logger?.child({ name: 'AuthController' }) ?? noopLogger;
  }

  /**
   * POST /api/auth/login
   *
   * Validates credentials and sets access + refresh token cookies on success.
   *
   * @returns 200 + cookies on success
   * @returns 401 for invalid credentials
   */
  async login(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    this.logger.debug('Received login request');

    try {
      const parseResult = loginSchema.safeParse(request.body);
      if (!parseResult.success) {
        const errorResponse = mapErrorToHttpResponse(parseResult.error);
        return reply.status(errorResponse.statusCode).send(errorResponse.body);
      }

      const tokens = await this.loginUseCase.execute(parseResult.data);

      reply.setCookie(COOKIE_ACCESS_TOKEN, tokens.accessToken, {
        ...baseCookieOptions,
        maxAge: ACCESS_TOKEN_MAX_AGE_SEC,
      });
      reply.setCookie(COOKIE_REFRESH_TOKEN, tokens.refreshToken, {
        ...baseCookieOptions,
        maxAge: REFRESH_TOKEN_MAX_AGE_SEC,
      });

      this.logger.info('User logged in successfully');
      return reply.status(200).send(successResponse({ message: 'Login successful' }));
    } catch (error) {
      const errorResponse = mapErrorToHttpResponse(error);
      this.logger.debug('Login failed', { statusCode: errorResponse.statusCode });
      return reply.status(errorResponse.statusCode).send(errorResponse.body);
    }
  }

  /**
   * POST /api/auth/logout
   *
   * Clears authentication cookies.
   *
   * @returns 200 always
   */
  async logout(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    this.logger.debug('Received logout request');

    try {
      await this.logoutUseCase.execute();

      reply.clearCookie(COOKIE_ACCESS_TOKEN, { path: '/' });
      reply.clearCookie(COOKIE_REFRESH_TOKEN, { path: '/' });

      this.logger.info('User logged out successfully');
      return reply.status(200).send(successResponse({ message: 'Logout successful' }));
    } catch (error) {
      const errorResponse = mapErrorToHttpResponse(error);
      return reply.status(errorResponse.statusCode).send(errorResponse.body);
    }
  }

  /**
   * POST /api/auth/refresh
   *
   * Reads the refresh_token cookie and issues a new token pair.
   *
   * @returns 200 + new cookies on success
   * @returns 401 if refresh token is missing, invalid, or expired
   */
  async refresh(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    this.logger.debug('Received token refresh request');

    try {
      const refreshToken = request.cookies?.[COOKIE_REFRESH_TOKEN];
      if (!refreshToken) {
        const errorResponse = mapErrorToHttpResponse(
          Object.assign(new Error('Refresh token missing'), { _isAuthError: true }),
        );
        return reply.status(401).send(errorResponse.body);
      }

      const tokens = await this.refreshTokenUseCase.execute({ refreshToken });

      reply.setCookie(COOKIE_ACCESS_TOKEN, tokens.accessToken, {
        ...baseCookieOptions,
        maxAge: ACCESS_TOKEN_MAX_AGE_SEC,
      });
      reply.setCookie(COOKIE_REFRESH_TOKEN, tokens.refreshToken, {
        ...baseCookieOptions,
        maxAge: REFRESH_TOKEN_MAX_AGE_SEC,
      });

      this.logger.info('Tokens refreshed successfully');
      return reply.status(200).send(successResponse({ message: 'Token refreshed' }));
    } catch (error) {
      const errorResponse = mapErrorToHttpResponse(error);
      this.logger.debug('Token refresh failed', { statusCode: errorResponse.statusCode });
      return reply.status(errorResponse.statusCode).send(errorResponse.body);
    }
  }

  /**
   * POST /api/auth/forgot-password
   *
   * Initiates the password reset flow for the given email.
   * Always returns 200 to prevent user enumeration.
   *
   * @returns 200 always
   */
  async forgotPassword(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    this.logger.debug('Received forgot-password request');

    try {
      const parseResult = forgotPasswordSchema.safeParse(request.body);
      if (!parseResult.success) {
        const errorResponse = mapErrorToHttpResponse(parseResult.error);
        return reply.status(errorResponse.statusCode).send(errorResponse.body);
      }

      await this.forgotPasswordUseCase.execute(parseResult.data);

      this.logger.info('Forgot-password flow initiated');
      return reply.status(200).send(
        successResponse({ message: 'If that email is registered, a reset link has been sent.' }),
      );
    } catch (error) {
      const errorResponse = mapErrorToHttpResponse(error);
      return reply.status(errorResponse.statusCode).send(errorResponse.body);
    }
  }

  /**
   * POST /api/auth/reset-password
   *
   * Validates the reset token and updates the user's password.
   *
   * @returns 200 on success
   * @returns 400 for invalid or expired token
   */
  async resetPassword(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    this.logger.debug('Received reset-password request');

    try {
      const parseResult = resetPasswordSchema.safeParse(request.body);
      if (!parseResult.success) {
        const errorResponse = mapErrorToHttpResponse(parseResult.error);
        return reply.status(errorResponse.statusCode).send(errorResponse.body);
      }

      await this.resetPasswordUseCase.execute(parseResult.data);

      this.logger.info('Password reset successfully');
      return reply.status(200).send(successResponse({ message: 'Password reset successful' }));
    } catch (error) {
      const errorResponse = mapErrorToHttpResponse(error);
      this.logger.debug('Password reset failed', { statusCode: errorResponse.statusCode });
      return reply.status(errorResponse.statusCode).send(errorResponse.body);
    }
  }
}
