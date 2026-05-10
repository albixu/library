/**
 * E2E Tests: POST /api/books/:id/favorite, GET /api/books?favorites=true, POST /api/books/:id/send (download)
 *
 * End-to-end tests for HU-039 HTTP endpoints:
 * - POST /api/books/:id/favorite: toggle favorite (auth required)
 * - GET /api/books?favorites=true: filter by favorites (optional auth)
 * - POST /api/books/:id/send: registers download when user is authenticated
 *
 * These tests use mock use cases — no database required.
 *
 * HU-039: Favorites and downloads HTTP endpoint tests.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createServer } from '../../../src/infrastructure/driver/http/server.js';
import { noopLogger } from '../../../src/application/ports/Logger.js';
import { BookNotFoundError } from '../../../src/domain/errors/DomainErrors.js';

// ─────────────────────────────────────────────────────────────────────────────
// Test helpers
// ─────────────────────────────────────────────────────────────────────────────

const TEST_PORT = 3098;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

const VALID_BOOK_ID = '550e8400-e29b-41d4-a716-446655440000';
const VALID_USER_ID = '660e8400-e29b-41d4-a716-446655440001';
const VALID_TOKEN = 'valid-access-token';

/** Minimal no-op stubs for use cases not under test */
function makeNoopUseCases() {
  return {
    createBookUseCase: { execute: vi.fn().mockResolvedValue({}) },
    listBookTypesUseCase: { execute: vi.fn().mockResolvedValue([]) },
    listCategoriesUseCase: { execute: vi.fn().mockResolvedValue([]) },
    listBookLevelsUseCase: { execute: vi.fn().mockResolvedValue([]) },
    loginUseCase: { execute: vi.fn().mockResolvedValue({ accessToken: '', refreshToken: '' }) },
    logoutUseCase: { execute: vi.fn().mockResolvedValue(undefined) },
    refreshTokenUseCase: { execute: vi.fn().mockResolvedValue({ accessToken: '', refreshToken: '' }) },
    forgotPasswordUseCase: { execute: vi.fn().mockResolvedValue(undefined) },
    resetPasswordUseCase: { execute: vi.fn().mockResolvedValue(undefined) },
  };
}

/**
 * Creates a JwtService mock that accepts VALID_TOKEN and returns VALID_USER_ID.
 */
function makeJwtService() {
  return {
    signTokens: vi.fn(),
    verifyAccessToken: vi.fn().mockImplementation(async (token: string) => {
      if (token === VALID_TOKEN) {
        return { userId: VALID_USER_ID, email: 'user@example.com' };
      }
      throw new Error('Invalid token');
    }),
    verifyRefreshToken: vi.fn(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/books/:id/favorite
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/books/:id/favorite', () => {
  let server: FastifyInstance;
  let toggleFavoriteExecute: ReturnType<typeof vi.fn>;

  beforeAll(async () => {
    toggleFavoriteExecute = vi.fn();
    const jwtService = makeJwtService();

    server = await createServer(
      {
        ...makeNoopUseCases(),
        searchBooksUseCase: {
          execute: vi.fn().mockResolvedValue({ items: [], pagination: { limit: 50, hasNextPage: false, nextCursor: null, totalCount: 0 } }),
        },
        sendBookByEmailUseCase: { execute: vi.fn().mockResolvedValue(undefined) },
        toggleFavoriteUseCase: { execute: toggleFavoriteExecute },
        jwtService,
        logger: noopLogger,
      },
      { prefix: '/api', nodeEnv: 'test' },
    );
    await server.listen({ port: TEST_PORT, host: '127.0.0.1' });
  });

  afterAll(async () => {
    await server.close();
  });

  it('should return 401 when no access_token cookie is present', async () => {
    const response = await fetch(`${BASE_URL}/api/books/${VALID_BOOK_ID}/favorite`, {
      method: 'POST',
    });

    expect(response.status).toBe(401);
    const body = await response.json() as { success: boolean };
    expect(body.success).toBe(false);
  });

  it('should return 401 when access_token cookie is invalid', async () => {
    const response = await fetch(`${BASE_URL}/api/books/${VALID_BOOK_ID}/favorite`, {
      method: 'POST',
      headers: { Cookie: 'access_token=invalid-token' },
    });

    expect(response.status).toBe(401);
    const body = await response.json() as { success: boolean };
    expect(body.success).toBe(false);
  });

  it('should return 200 with { favorite: true } when toggled on', async () => {
    toggleFavoriteExecute.mockResolvedValueOnce({ favorite: true });

    const response = await fetch(`${BASE_URL}/api/books/${VALID_BOOK_ID}/favorite`, {
      method: 'POST',
      headers: { Cookie: `access_token=${VALID_TOKEN}` },
    });

    expect(response.status).toBe(200);
    const body = await response.json() as { success: boolean; data: { favorite: boolean } };
    expect(body.success).toBe(true);
    expect(body.data.favorite).toBe(true);

    expect(toggleFavoriteExecute).toHaveBeenCalledTimes(1);
    const callArg = toggleFavoriteExecute.mock.calls[0][0];
    expect(callArg.userId.value).toBe(VALID_USER_ID);
    expect(callArg.bookId.value).toBe(VALID_BOOK_ID);
  });

  it('should return 200 with { favorite: false } when toggled off', async () => {
    toggleFavoriteExecute.mockResolvedValueOnce({ favorite: false });

    const response = await fetch(`${BASE_URL}/api/books/${VALID_BOOK_ID}/favorite`, {
      method: 'POST',
      headers: { Cookie: `access_token=${VALID_TOKEN}` },
    });

    expect(response.status).toBe(200);
    const body = await response.json() as { success: boolean; data: { favorite: boolean } };
    expect(body.success).toBe(true);
    expect(body.data.favorite).toBe(false);
  });

  it('should return 404 when the book does not exist', async () => {
    toggleFavoriteExecute.mockRejectedValueOnce(new BookNotFoundError(VALID_BOOK_ID));

    const response = await fetch(`${BASE_URL}/api/books/${VALID_BOOK_ID}/favorite`, {
      method: 'POST',
      headers: { Cookie: `access_token=${VALID_TOKEN}` },
    });

    expect(response.status).toBe(404);
    const body = await response.json() as { success: boolean };
    expect(body.success).toBe(false);
  });

  it('should return 400 when book id is not a valid UUID', async () => {
    const response = await fetch(`${BASE_URL}/api/books/not-a-uuid/favorite`, {
      method: 'POST',
      headers: { Cookie: `access_token=${VALID_TOKEN}` },
    });

    // InvalidUUIDError is a DomainError → 400
    expect(response.status).toBe(400);
    const body = await response.json() as { success: boolean };
    expect(body.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/books?favorites=true
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/books?favorites=true', () => {
  let server: FastifyInstance;
  let searchBooksExecute: ReturnType<typeof vi.fn>;

  beforeAll(async () => {
    searchBooksExecute = vi.fn().mockResolvedValue({
      items: [],
      pagination: { limit: 50, hasNextPage: false, nextCursor: null, totalCount: 0 },
    });
    const jwtService = makeJwtService();

    server = await createServer(
      {
        ...makeNoopUseCases(),
        searchBooksUseCase: { execute: searchBooksExecute },
        sendBookByEmailUseCase: { execute: vi.fn().mockResolvedValue(undefined) },
        jwtService,
        logger: noopLogger,
      },
      { prefix: '/api', nodeEnv: 'test' },
    );
    await server.listen({ port: TEST_PORT + 1, host: '127.0.0.1' });
  });

  afterAll(async () => {
    await server.close();
  });

  it('should ignore favorites filter when no token is present', async () => {
    searchBooksExecute.mockClear();

    const response = await fetch(`${BASE_URL.replace(`:${TEST_PORT}`, `:${TEST_PORT + 1}`)}/api/books?favorites=true`);

    expect(response.status).toBe(200);

    // favoritesOf should be undefined since no token
    const callArg = searchBooksExecute.mock.calls[0][0];
    expect(callArg.favoritesOf).toBeUndefined();
  });

  it('should pass favoritesOf when token is valid and favorites=true', async () => {
    searchBooksExecute.mockClear();

    const response = await fetch(`${BASE_URL.replace(`:${TEST_PORT}`, `:${TEST_PORT + 1}`)}/api/books?favorites=true`, {
      headers: { Cookie: `access_token=${VALID_TOKEN}` },
    });

    expect(response.status).toBe(200);

    const callArg = searchBooksExecute.mock.calls[0][0];
    expect(callArg.favoritesOf).toBeDefined();
    expect(callArg.favoritesOf.value).toBe(VALID_USER_ID);
  });

  it('should NOT pass favoritesOf when favorites=false even with a valid token', async () => {
    searchBooksExecute.mockClear();

    const response = await fetch(`${BASE_URL.replace(`:${TEST_PORT}`, `:${TEST_PORT + 1}`)}/api/books?favorites=false`, {
      headers: { Cookie: `access_token=${VALID_TOKEN}` },
    });

    expect(response.status).toBe(200);

    const callArg = searchBooksExecute.mock.calls[0][0];
    expect(callArg.favoritesOf).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/books/:id/send — RegisterDownloadUseCase integration
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/books/:id/send — download registration', () => {
  let server: FastifyInstance;
  let sendBookByEmailExecute: ReturnType<typeof vi.fn>;
  let registerDownloadExecute: ReturnType<typeof vi.fn>;

  beforeAll(async () => {
    sendBookByEmailExecute = vi.fn().mockResolvedValue(undefined);
    registerDownloadExecute = vi.fn().mockResolvedValue(undefined);
    const jwtService = makeJwtService();

    server = await createServer(
      {
        ...makeNoopUseCases(),
        searchBooksUseCase: {
          execute: vi.fn().mockResolvedValue({ items: [], pagination: { limit: 50, hasNextPage: false, nextCursor: null, totalCount: 0 } }),
        },
        sendBookByEmailUseCase: { execute: sendBookByEmailExecute },
        registerDownloadUseCase: { execute: registerDownloadExecute },
        jwtService,
        logger: noopLogger,
      },
      { prefix: '/api', nodeEnv: 'test' },
    );
    await server.listen({ port: TEST_PORT + 2, host: '127.0.0.1' });
  });

  afterAll(async () => {
    await server.close();
  });

  const baseUrl = `http://127.0.0.1:${TEST_PORT + 2}`;

  it('should call RegisterDownloadUseCase when user is authenticated', async () => {
    registerDownloadExecute.mockClear();

    const response = await fetch(`${baseUrl}/api/books/${VALID_BOOK_ID}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `access_token=${VALID_TOKEN}`,
      },
      body: JSON.stringify({ email: 'test@example.com' }),
    });

    expect(response.status).toBe(200);

    // Give fire-and-forget a tick to complete
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(registerDownloadExecute).toHaveBeenCalledTimes(1);
    const callArg = registerDownloadExecute.mock.calls[0][0];
    expect(callArg.userId.value).toBe(VALID_USER_ID);
    expect(callArg.bookId.value).toBe(VALID_BOOK_ID);
  });

  it('should NOT call RegisterDownloadUseCase when user is not authenticated', async () => {
    registerDownloadExecute.mockClear();

    const response = await fetch(`${baseUrl}/api/books/${VALID_BOOK_ID}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com' }),
    });

    expect(response.status).toBe(200);

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(registerDownloadExecute).not.toHaveBeenCalled();
  });

  it('should still return 200 even if RegisterDownloadUseCase fails', async () => {
    registerDownloadExecute.mockRejectedValueOnce(new Error('DB error'));

    const response = await fetch(`${baseUrl}/api/books/${VALID_BOOK_ID}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `access_token=${VALID_TOKEN}`,
      },
      body: JSON.stringify({ email: 'test@example.com' }),
    });

    // Response should not be affected by download registration failure
    expect(response.status).toBe(200);
    const body = await response.json() as { success: boolean; data: { sent: boolean } };
    expect(body.success).toBe(true);
    expect(body.data.sent).toBe(true);
  });
});
