/**
 * E2E Tests: POST /api/books/:id/send
 *
 * End-to-end tests for the send book by email API endpoint.
 * These tests validate the complete HTTP flow.
 *
 * Tests cover:
 * - Successful email send (200)
 * - Invalid email address (400)
 * - Book not found (404)
 * - Book without file path or non-existent file (422)
 *
 * HU-036: Send book by email feature.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeFile, unlink } from 'node:fs/promises';
import {
  createE2EContext,
  E2E_BASE_URL,
} from '../setup.js';
import type { EmailPort } from '../../../src/application/ports/EmailPort.js';
import { PostgresBookRepository } from '../../../src/infrastructure/driven/persistence/PostgresBookRepository.js';
import { PostgresCategoryRepository } from '../../../src/infrastructure/driven/persistence/PostgresCategoryRepository.js';
import { PostgresTypeRepository } from '../../../src/infrastructure/driven/persistence/PostgresTypeRepository.js';
import { PostgresAuthorRepository } from '../../../src/infrastructure/driven/persistence/PostgresAuthorRepository.js';
import { PostgresLevelRepository } from '../../../src/infrastructure/driven/persistence/PostgresLevelRepository.js';
import { OllamaEmbeddingService } from '../../../src/infrastructure/driven/embedding/OllamaEmbeddingService.js';
import { LibreTranslateTranslationService } from '../../../src/infrastructure/driven/translation/LibreTranslateTranslationService.js';
import { CreateBookUseCase } from '../../../src/application/use-cases/CreateBookUseCase.js';
import { SearchBooksUseCase } from '../../../src/application/use-cases/SearchBooksUseCase.js';
import { ListBookTypesUseCase } from '../../../src/application/use-cases/ListBookTypesUseCase.js';
import { ListCategoriesUseCase } from '../../../src/application/use-cases/ListCategoriesUseCase.js';
import { ListBookLevelsUseCase } from '../../../src/application/use-cases/ListBookLevelsUseCase.js';
import { SendBookByEmailUseCase } from '../../../src/application/use-cases/SendBookByEmailUseCase.js';
import { NodeFileSystemAdapter } from '../../../src/infrastructure/driven/filesystem/NodeFileSystemAdapter.js';
import { createServer } from '../../../src/infrastructure/driver/http/server.js';
import { noopLogger } from '../../../src/application/ports/Logger.js';
import type { FastifyInstance } from 'fastify';
import type { TestDb } from '../setup.js';

const OLLAMA_EMBEDDING_URL =
  process.env['OLLAMA_EMBEDDING_URL'] ??
  process.env['OLLAMA_BASE_URL'] ??
  process.env['OLLAMA_URL'] ??
  'http://ollama-embeddings:11434';
const LIBRETRANSLATE_URL =
  process.env['LIBRETRANSLATE_URL'] ?? 'http://libretranslate-test:5000';
const E2E_SERVER_PORT = 3099; // dedicated port for this test file
const E2E_SERVER_HOST = '127.0.0.1';
const BASE_URL = `http://${E2E_SERVER_HOST}:${E2E_SERVER_PORT}`;

/**
 * Creates a server for send-book tests, injecting a mock EmailPort and
 * a configurable FileSystemPort (via booksMountPath override).
 */
async function createSendBookTestServer(
  db: TestDb,
  emailPort: EmailPort,
  booksMountPath: string,
): Promise<FastifyInstance> {
  const ollamaModel = process.env['OLLAMA_MODEL'] ?? 'nomic-embed-text';

  const embeddingService = new OllamaEmbeddingService({
    baseUrl: OLLAMA_EMBEDDING_URL,
    model: ollamaModel,
    timeoutMs: 30000,
  });
  const translationService = new LibreTranslateTranslationService({
    baseUrl: LIBRETRANSLATE_URL,
    timeoutMs: 30000,
    retries: 3,
  });

  const bookRepository = new PostgresBookRepository(db as any);
  const categoryRepository = new PostgresCategoryRepository(db as any);
  const typeRepository = new PostgresTypeRepository(db as any);
  const authorRepository = new PostgresAuthorRepository(db as any);
  const levelRepository = new PostgresLevelRepository(db as any);

  const createBookUseCase = new CreateBookUseCase({
    bookRepository,
    categoryRepository,
    typeRepository,
    authorRepository,
    levelRepository,
    embeddingService,
    translationService,
    logger: noopLogger,
  });

  const searchBooksUseCase = new SearchBooksUseCase({
    bookRepository,
    embeddingService,
    logger: noopLogger,
  });

  const listBookTypesUseCase = new ListBookTypesUseCase(typeRepository);
  const listCategoriesUseCase = new ListCategoriesUseCase(categoryRepository, typeRepository);
  const listBookLevelsUseCase = new ListBookLevelsUseCase(levelRepository, typeRepository);

  const fileSystemAdapter = new NodeFileSystemAdapter();
  const sendBookByEmailUseCase = new SendBookByEmailUseCase({
    bookRepository,
    fileSystemPort: fileSystemAdapter,
    emailPort,
    booksMountPath,
  });

  return createServer({
    createBookUseCase,
    searchBooksUseCase,
    listBookTypesUseCase,
    listCategoriesUseCase,
    listBookLevelsUseCase,
    sendBookByEmailUseCase,
    logger: noopLogger,
  });
}

describe('POST /api/books/:id/send', () => {
  const ctx = createE2EContext();
  let db: TestDb;
  let sendWithAttachmentMock: ReturnType<typeof vi.fn>;
  let emailPort: EmailPort;
  let server: FastifyInstance;
  let tmpBookPath: string;
  let booksMountPath: string;
  let createdBookId: string;
  let bookIdWithoutPath: string;

  beforeAll(async () => {
    const result = await ctx.setup();
    db = result.db;

    // Create a real temp file to simulate a book
    booksMountPath = tmpdir();
    tmpBookPath = join(booksMountPath, 'test-e2e-book.pdf');
    await writeFile(tmpBookPath, 'fake pdf content');

    // Mock email port
    sendWithAttachmentMock = vi.fn().mockResolvedValue(undefined);
    emailPort = { sendWithAttachment: sendWithAttachmentMock };

    server = await createSendBookTestServer(db, emailPort, booksMountPath);
    await server.listen({ port: E2E_SERVER_PORT, host: E2E_SERVER_HOST });
  });

  afterAll(async () => {
    await server.close();
    try { await unlink(tmpBookPath); } catch { /* ignore */ }
    await ctx.teardown();
  });

  beforeEach(async () => {
    await ctx.cleanup();
    sendWithAttachmentMock.mockClear();

    // Create a book WITH a file path (relative to booksMountPath)
    const resWithPath = await fetch(`${BASE_URL}/api/books`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Send E2E Book',
        authors: ['E2E Author'],
        description: 'Libro de prueba para envío por email en tests E2E.',
        type: 'technical',
        format: 'pdf',
        categories: ['E2E Testing'],
        language: 'es',
        available: true,
        path: 'test-e2e-book.pdf',
      }),
    });
    const bookData = await resWithPath.json() as { data: { id: string } };
    createdBookId = bookData.data.id;

    // Create a book WITHOUT a file path
    const resWithoutPath = await fetch(`${BASE_URL}/api/books`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Send E2E Book Without Path',
        authors: ['E2E Author'],
        description: 'Libro de prueba sin path para tests E2E de envío.',
        type: 'technical',
        format: 'pdf',
        categories: ['E2E Testing'],
        language: 'es',
        available: true,
        path: null,
      }),
    });
    const bookDataWithoutPath = await resWithoutPath.json() as { data: { id: string } };
    bookIdWithoutPath = bookDataWithoutPath.data.id;
  });

  it('should return 200 and call email adapter when book exists with file', async () => {
    const res = await fetch(`${BASE_URL}/api/books/${createdBookId}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user@example.com' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: { sent: boolean } };
    expect(body.success).toBe(true);
    expect(body.data.sent).toBe(true);
    expect(sendWithAttachmentMock).toHaveBeenCalledOnce();
    expect(sendWithAttachmentMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'user@example.com' }),
    );
  });

  it('should return 400 when email is invalid', async () => {
    const res = await fetch(`${BASE_URL}/api/books/${createdBookId}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email' }),
    });

    expect(res.status).toBe(400);
    const body = await res.json() as { success: boolean; error: { message: string } };
    expect(body.success).toBe(false);
    expect(body.error).toBeDefined();
    expect(sendWithAttachmentMock).not.toHaveBeenCalled();
  });

  it('should return 400 when email field is missing', async () => {
    const res = await fetch(`${BASE_URL}/api/books/${createdBookId}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
    const body = await res.json() as { success: boolean };
    expect(body.success).toBe(false);
    expect(sendWithAttachmentMock).not.toHaveBeenCalled();
  });

  it('should return 404 when book does not exist', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';

    const res = await fetch(`${BASE_URL}/api/books/${nonExistentId}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user@example.com' }),
    });

    expect(res.status).toBe(404);
    const body = await res.json() as { success: boolean; error: { message: string } };
    expect(body.success).toBe(false);
    expect(body.error.message).toContain(nonExistentId);
    expect(sendWithAttachmentMock).not.toHaveBeenCalled();
  });

  it('should return 422 when book has no file path', async () => {
    const res = await fetch(`${BASE_URL}/api/books/${bookIdWithoutPath}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user@example.com' }),
    });

    expect(res.status).toBe(422);
    const body = await res.json() as { success: boolean; error: { message: string } };
    expect(body.success).toBe(false);
    expect(body.error.message).toContain(bookIdWithoutPath);
    expect(sendWithAttachmentMock).not.toHaveBeenCalled();
  });

  it('should return 422 when book path points to a non-existent file', async () => {
    // Create a book with a path to a file that does NOT exist
    const resNonExistentFile = await fetch(`${BASE_URL}/api/books`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Book With Missing File',
        authors: ['E2E Author'],
        description: 'Libro con ruta a archivo que no existe.',
        type: 'technical',
        format: 'pdf',
        categories: ['E2E Testing'],
        language: 'es',
        available: true,
        path: 'nonexistent-file.pdf',
      }),
    });
    const missingFileBook = await resNonExistentFile.json() as { data: { id: string } };
    const missingFileBookId = missingFileBook.data.id;

    const res = await fetch(`${BASE_URL}/api/books/${missingFileBookId}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user@example.com' }),
    });

    expect(res.status).toBe(422);
    const body = await res.json() as { success: boolean };
    expect(body.success).toBe(false);
    expect(sendWithAttachmentMock).not.toHaveBeenCalled();
  });
});
