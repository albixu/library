/**
 * E2E Tests: GET /api/books/recommendations
 *
 * End-to-end tests for HU-040 HTTP endpoint:
 * - GET /api/books/recommendations: get personalized book recommendations (auth required)
 *
 * These tests use mock use cases — no database required.
 *
 * HU-040: Book recommendations HTTP endpoint tests.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createServer } from '../../../src/infrastructure/driver/http/server.js';
import { noopLogger } from '../../../src/application/ports/Logger.js';

// ─────────────────────────────────────────────────────────────────────────────
// Test helpers
// ─────────────────────────────────────────────────────────────────────────────

const TEST_PORT = 3099;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

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

/** Sample recommendation items */
const SAMPLE_ITEMS = [
  {
    bookId: '550e8400-e29b-41d4-a716-446655440000',
    title: 'Clean Code',
    author: 'Robert C. Martin',
    coverUrl: null,
    similarity: 0.87,
    dominantCategory: 'Programación',
  },
  {
    bookId: '660e8400-e29b-41d4-a716-446655440002',
    title: 'The Pragmatic Programmer',
    author: 'Andrew Hunt',
    coverUrl: 'https://example.com/cover.jpg',
    similarity: 0.75,
    dominantCategory: 'Programación',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/books/recommendations
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/books/recommendations', () => {
  let server: FastifyInstance;
  let getRecommendationsExecute: ReturnType<typeof vi.fn>;

  beforeAll(async () => {
    getRecommendationsExecute = vi.fn();
    const jwtService = makeJwtService();

    server = await createServer(
      {
        ...makeNoopUseCases(),
        searchBooksUseCase: {
          execute: vi.fn().mockResolvedValue({ items: [], pagination: { limit: 50, hasNextPage: false, nextCursor: null, totalCount: 0 } }),
        },
        sendBookByEmailUseCase: { execute: vi.fn().mockResolvedValue(undefined) },
        getRecommendationsUseCase: { execute: getRecommendationsExecute },
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
    const response = await fetch(`${BASE_URL}/api/books/recommendations`);

    expect(response.status).toBe(401);
    const body = await response.json() as { success: boolean };
    expect(body.success).toBe(false);
  });

  it('should return 401 when access_token cookie is invalid', async () => {
    const response = await fetch(`${BASE_URL}/api/books/recommendations`, {
      headers: { Cookie: 'access_token=invalid-token' },
    });

    expect(response.status).toBe(401);
    const body = await response.json() as { success: boolean };
    expect(body.success).toBe(false);
  });

  it('should return 200 with items and label when user has history', async () => {
    getRecommendationsExecute.mockResolvedValueOnce({
      items: SAMPLE_ITEMS,
      label: 'Porque te interesa Programación',
    });

    const response = await fetch(`${BASE_URL}/api/books/recommendations`, {
      headers: { Cookie: `access_token=${VALID_TOKEN}` },
    });

    expect(response.status).toBe(200);
    const body = await response.json() as {
      success: boolean;
      data: { items: typeof SAMPLE_ITEMS; label: string };
    };
    expect(body.success).toBe(true);
    expect(body.data.items).toHaveLength(2);
    expect(body.data.label).toBe('Porque te interesa Programación');
    expect(body.data.items[0].bookId).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(body.data.items[0].similarity).toBe(0.87);

    expect(getRecommendationsExecute).toHaveBeenCalledWith(VALID_USER_ID);
  });

  it('should return 200 with empty items when user has no history', async () => {
    getRecommendationsExecute.mockResolvedValueOnce({
      items: [],
      label: '',
    });

    const response = await fetch(`${BASE_URL}/api/books/recommendations`, {
      headers: { Cookie: `access_token=${VALID_TOKEN}` },
    });

    expect(response.status).toBe(200);
    const body = await response.json() as {
      success: boolean;
      data: { items: unknown[]; label: string };
    };
    expect(body.success).toBe(true);
    expect(body.data.items).toHaveLength(0);
    expect(body.data.label).toBe('');
  });

  it('should pass the authenticated userId to the use case', async () => {
    getRecommendationsExecute.mockClear();
    getRecommendationsExecute.mockResolvedValueOnce({ items: [], label: '' });

    await fetch(`${BASE_URL}/api/books/recommendations`, {
      headers: { Cookie: `access_token=${VALID_TOKEN}` },
    });

    expect(getRecommendationsExecute).toHaveBeenCalledTimes(1);
    expect(getRecommendationsExecute).toHaveBeenCalledWith(VALID_USER_ID);
  });
});
