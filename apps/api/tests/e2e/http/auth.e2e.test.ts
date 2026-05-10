/**
 * E2E Tests: POST /api/auth/*
 *
 * End-to-end tests for the authentication API endpoints.
 * These tests validate the complete HTTP flow using mock use cases
 * (no database required — auth logic is tested in unit/integration layers).
 *
 * Tests cover:
 * - POST /api/auth/login      — success (200 + cookies), invalid credentials (401), validation (400)
 * - POST /api/auth/logout     — success (200 + cleared cookies)
 * - POST /api/auth/refresh    — success (200 + new cookies), missing cookie (401), invalid token (401)
 * - POST /api/auth/forgot-password — always 200
 * - POST /api/auth/reset-password  — success (200), expired token (400), invalid token (400)
 *
 * HU-038: Authentication endpoints E2E tests.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createServer } from '../../../src/infrastructure/driver/http/server.js';
import { noopLogger } from '../../../src/application/ports/Logger.js';
import { InvalidCredentialsError } from '../../../src/domain/user/errors/UserErrors.js';
import {
  PasswordResetTokenExpiredError,
  PasswordResetTokenInvalidError,
} from '../../../src/domain/user/errors/UserErrors.js';

// ─────────────────────────────────────────────────────────────────────────────
// Test server helpers
// ─────────────────────────────────────────────────────────────────────────────

const TEST_PORT = 3099;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

/** Minimal no-op stubs for non-auth use cases required by createServer */
function makeNoopUseCases() {
  return {
    createBookUseCase: { execute: vi.fn().mockResolvedValue({}) },
    searchBooksUseCase: { execute: vi.fn().mockResolvedValue({ books: [], total: 0 }) },
    listBookTypesUseCase: { execute: vi.fn().mockResolvedValue([]) },
    listCategoriesUseCase: { execute: vi.fn().mockResolvedValue([]) },
    listBookLevelsUseCase: { execute: vi.fn().mockResolvedValue([]) },
    sendBookByEmailUseCase: { execute: vi.fn().mockResolvedValue(undefined) },
  };
}

/** Default token pair returned by mock loginUseCase */
const MOCK_TOKENS = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
};

interface AuthUseCaseMocks {
  loginExecute: ReturnType<typeof vi.fn>;
  logoutExecute: ReturnType<typeof vi.fn>;
  refreshExecute: ReturnType<typeof vi.fn>;
  forgotPasswordExecute: ReturnType<typeof vi.fn>;
  resetPasswordExecute: ReturnType<typeof vi.fn>;
}

async function createAuthTestServer(mocks: AuthUseCaseMocks): Promise<FastifyInstance> {
  const server = await createServer(
    {
      ...makeNoopUseCases(),
      loginUseCase: { execute: mocks.loginExecute },
      logoutUseCase: { execute: mocks.logoutExecute },
      refreshTokenUseCase: { execute: mocks.refreshExecute },
      forgotPasswordUseCase: { execute: mocks.forgotPasswordExecute },
      resetPasswordUseCase: { execute: mocks.resetPasswordExecute },
      logger: noopLogger,
    },
    { prefix: '/api', nodeEnv: 'test' },
  );
  await server.listen({ port: TEST_PORT, host: '127.0.0.1' });
  return server;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  let server: FastifyInstance;
  let loginExecute: ReturnType<typeof vi.fn>;

  beforeAll(async () => {
    loginExecute = vi.fn();
    server = await createAuthTestServer({
      loginExecute,
      logoutExecute: vi.fn().mockResolvedValue(undefined),
      refreshExecute: vi.fn(),
      forgotPasswordExecute: vi.fn().mockResolvedValue(undefined),
      resetPasswordExecute: vi.fn(),
    });
  });

  afterAll(async () => {
    await server.close();
  });

  it('should return 200 and set httpOnly cookies on successful login', async () => {
    loginExecute.mockResolvedValueOnce(MOCK_TOKENS);

    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user@example.com', password: 'secret123' }),
    });

    expect(response.status).toBe(200);

    const body = await response.json() as { success: boolean; data: { message: string } };
    expect(body.success).toBe(true);
    expect(body.data.message).toBe('Login successful');

    // Verify cookies are set
    const setCookieHeaders = response.headers.getSetCookie
      ? response.headers.getSetCookie()
      : [response.headers.get('set-cookie') ?? ''];

    const cookieString = setCookieHeaders.join('; ');
    expect(cookieString).toContain('access_token=mock-access-token');
    expect(cookieString).toContain('refresh_token=mock-refresh-token');
    expect(cookieString.toLowerCase()).toContain('httponly');
    expect(cookieString.toLowerCase()).toContain('samesite=strict');
  });

  it('should return 401 for invalid credentials', async () => {
    loginExecute.mockRejectedValueOnce(new InvalidCredentialsError());

    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user@example.com', password: 'wrong-password' }),
    });

    expect(response.status).toBe(401);

    const body = await response.json() as { success: boolean; error: { message: string } };
    expect(body.success).toBe(false);
    expect(body.error.message).toContain('Invalid email or password');
  });

  it('should return 400 for invalid email format', async () => {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email', password: 'secret123' }),
    });

    expect(response.status).toBe(400);
    const body = await response.json() as { success: boolean };
    expect(body.success).toBe(false);
  });

  it('should return 400 when password is missing', async () => {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user@example.com' }),
    });

    expect(response.status).toBe(400);
    const body = await response.json() as { success: boolean };
    expect(body.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/logout
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/auth/logout', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = await createAuthTestServer({
      loginExecute: vi.fn(),
      logoutExecute: vi.fn().mockResolvedValue(undefined),
      refreshExecute: vi.fn(),
      forgotPasswordExecute: vi.fn(),
      resetPasswordExecute: vi.fn(),
    });
  });

  afterAll(async () => {
    await server.close();
  });

  it('should return 200 and clear cookies', async () => {
    const response = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
    });

    expect(response.status).toBe(200);

    const body = await response.json() as { success: boolean; data: { message: string } };
    expect(body.success).toBe(true);
    expect(body.data.message).toBe('Logout successful');

    // Verify cookies are cleared (maxAge=0 or expires in the past)
    const setCookieHeaders = response.headers.getSetCookie
      ? response.headers.getSetCookie()
      : [response.headers.get('set-cookie') ?? ''];

    const cookieString = setCookieHeaders.join('; ');
    // @fastify/cookie clearCookie sets expires to epoch
    expect(cookieString).toContain('access_token=');
    expect(cookieString).toContain('refresh_token=');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/refresh
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/auth/refresh', () => {
  let server: FastifyInstance;
  let refreshExecute: ReturnType<typeof vi.fn>;

  beforeAll(async () => {
    refreshExecute = vi.fn();
    server = await createAuthTestServer({
      loginExecute: vi.fn(),
      logoutExecute: vi.fn().mockResolvedValue(undefined),
      refreshExecute,
      forgotPasswordExecute: vi.fn(),
      resetPasswordExecute: vi.fn(),
    });
  });

  afterAll(async () => {
    await server.close();
  });

  it('should return 200 and new cookies when refresh token is valid', async () => {
    refreshExecute.mockResolvedValueOnce(MOCK_TOKENS);

    const response = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Cookie': 'refresh_token=valid-refresh-token',
      },
    });

    expect(response.status).toBe(200);

    const body = await response.json() as { success: boolean; data: { message: string } };
    expect(body.success).toBe(true);
    expect(body.data.message).toBe('Token refreshed');

    const setCookieHeaders = response.headers.getSetCookie
      ? response.headers.getSetCookie()
      : [response.headers.get('set-cookie') ?? ''];
    expect(setCookieHeaders.join('; ')).toContain('access_token=mock-access-token');
  });

  it('should return 401 when refresh token cookie is missing', async () => {
    const response = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
    });

    expect(response.status).toBe(401);
    const body = await response.json() as { success: boolean };
    expect(body.success).toBe(false);
  });

  it('should return 401 when refresh token is invalid', async () => {
    refreshExecute.mockRejectedValueOnce(new InvalidCredentialsError());

    const response = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Cookie': 'refresh_token=expired-or-invalid-token',
      },
    });

    expect(response.status).toBe(401);
    const body = await response.json() as { success: boolean };
    expect(body.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/forgot-password
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/auth/forgot-password', () => {
  let server: FastifyInstance;
  let forgotPasswordExecute: ReturnType<typeof vi.fn>;

  beforeAll(async () => {
    forgotPasswordExecute = vi.fn().mockResolvedValue(undefined);
    server = await createAuthTestServer({
      loginExecute: vi.fn(),
      logoutExecute: vi.fn().mockResolvedValue(undefined),
      refreshExecute: vi.fn(),
      forgotPasswordExecute,
      resetPasswordExecute: vi.fn(),
    });
  });

  afterAll(async () => {
    await server.close();
  });

  it('should return 200 for a registered email', async () => {
    const response = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user@example.com' }),
    });

    expect(response.status).toBe(200);
    const body = await response.json() as { success: boolean; data: { message: string } };
    expect(body.success).toBe(true);
    expect(body.data.message).toContain('reset link');
  });

  it('should return 200 even for an unregistered email (no enumeration)', async () => {
    // The use case returns void silently for unknown emails
    const response = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'unknown@example.com' }),
    });

    expect(response.status).toBe(200);
    const body = await response.json() as { success: boolean };
    expect(body.success).toBe(true);
  });

  it('should return 400 for invalid email format', async () => {
    const response = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email' }),
    });

    expect(response.status).toBe(400);
    const body = await response.json() as { success: boolean };
    expect(body.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/reset-password
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/auth/reset-password', () => {
  let server: FastifyInstance;
  let resetPasswordExecute: ReturnType<typeof vi.fn>;

  beforeAll(async () => {
    resetPasswordExecute = vi.fn();
    server = await createAuthTestServer({
      loginExecute: vi.fn(),
      logoutExecute: vi.fn().mockResolvedValue(undefined),
      refreshExecute: vi.fn(),
      forgotPasswordExecute: vi.fn().mockResolvedValue(undefined),
      resetPasswordExecute,
    });
  });

  afterAll(async () => {
    await server.close();
  });

  it('should return 200 on successful password reset', async () => {
    resetPasswordExecute.mockResolvedValueOnce(undefined);

    const response = await fetch(`${BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'valid-token', newPassword: 'NewPassword123!' }),
    });

    expect(response.status).toBe(200);
    const body = await response.json() as { success: boolean; data: { message: string } };
    expect(body.success).toBe(true);
    expect(body.data.message).toBe('Password reset successful');
  });

  it('should return 400 for an expired token', async () => {
    resetPasswordExecute.mockRejectedValueOnce(new PasswordResetTokenExpiredError());

    const response = await fetch(`${BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'expired-token', newPassword: 'NewPassword123!' }),
    });

    expect(response.status).toBe(400);
    const body = await response.json() as { success: boolean; error: { message: string } };
    expect(body.success).toBe(false);
    expect(body.error.message).toContain('expired');
  });

  it('should return 400 for an invalid token', async () => {
    resetPasswordExecute.mockRejectedValueOnce(new PasswordResetTokenInvalidError());

    const response = await fetch(`${BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'invalid-token', newPassword: 'NewPassword123!' }),
    });

    expect(response.status).toBe(400);
    const body = await response.json() as { success: boolean; error: { message: string } };
    expect(body.success).toBe(false);
    expect(body.error.message).toContain('invalid');
  });

  it('should return 400 when newPassword is too short', async () => {
    const response = await fetch(`${BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'some-token', newPassword: 'short' }),
    });

    expect(response.status).toBe(400);
    const body = await response.json() as { success: boolean };
    expect(body.success).toBe(false);
  });

  it('should return 400 when token is missing', async () => {
    const response = await fetch(`${BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword: 'NewPassword123!' }),
    });

    expect(response.status).toBe(400);
    const body = await response.json() as { success: boolean };
    expect(body.success).toBe(false);
  });
});
