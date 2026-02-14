/**
 * E2E Tests: CLI add command
 *
 * End-to-end tests for the 'library add' CLI command.
 * These tests execute the CLI as a child process and verify:
 * - Exit codes
 * - Stdout/stderr output
 * - Actual database state
 *
 * Tests cover:
 * - Successful book creation (exit 0)
 * - Missing required field (exit 1)
 * - Duplicate ISBN (exit 1)
 * - Embedding service unavailable (exit 1)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { join } from 'path';
import {
  createTestDb,
  closeTestDb,
  clearTestData,
  executeCli,
  generateUniqueISBN,
  type TestDb,
} from '../setup.js';

describe('CLI add command (E2E)', () => {
  let db: TestDb;
  // When running inside Docker container, cwd is already /app (the api-cli root)
  // When running locally, cwd would be the monorepo root
  const cliCwd = process.cwd().includes('apps') ? process.cwd() : process.cwd();

  beforeAll(async () => {
    db = await createTestDb();
  });

  afterAll(async () => {
    await clearTestData(db);
    await closeTestDb(db);
  });

  beforeEach(async () => {
    await clearTestData(db);
  });

  // Tests now enabled - TypeRepository and AuthorRepository implemented
  describe('Successful Creation', () => {
    it('should create a book and exit with code 0', async () => {
      const isbn = generateUniqueISBN();

      const result = await executeCli(
        [
          'add',
          '-t', 'CLI Test Book',
          '-a', 'CLI Author',
          '-d', 'A book created via CLI E2E test.',
          '-T', 'technical',
          '-f', 'pdf',
          '-c', 'CLI Testing',
          '--isbn', isbn,
          '-p', '/test/cli-book.pdf',
        ],
        { cwd: cliCwd }
      );

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('CLI Test Book');
      expect(result.stdout).toContain('CLI Author');
    });

    it('should display book summary on successful creation', async () => {
      const result = await executeCli(
        [
          'add',
          '-t', 'Summary Test Book',
          '-a', 'Summary Author',
          '-d', 'Testing stdout output format.',
          '-T', 'novel',
          '-f', 'epub',
          '-c', 'Testing',
        ],
        { cwd: cliCwd }
      );

      expect(result.exitCode).toBe(0);

      // Verify output contains key information
      expect(result.stdout).toContain('Summary Test Book');
      expect(result.stdout).toContain('Summary Author');
      // Should show created indicator (Spanish: "exitosamente")
      expect(result.stdout.toLowerCase()).toMatch(/created|added|success|exitosamente|creado/);
    });

    it('should create book with multiple categories', async () => {
      const result = await executeCli(
        [
          'add',
          '-t', 'Multi-Category CLI Book',
          '-a', 'CLI Author',
          '-d', 'A book with multiple categories via CLI.',
          '-T', 'technical',
          '-f', 'pdf',
          '-c', 'Programming,Testing,Best Practices',
        ],
        { cwd: cliCwd }
      );

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Multi-Category CLI Book');
    });

    it('should create book without optional fields', async () => {
      const result = await executeCli(
        [
          'add',
          '-t', 'Minimal CLI Book',
          '-a', 'Minimal Author',
          '-d', 'A book with only required fields.',
          '-T', 'biography',
          '-f', 'txt',
          '-c', 'Minimal',
        ],
        { cwd: cliCwd }
      );

      expect(result.exitCode).toBe(0);
    });
  });

  describe('Missing Required Fields', () => {
    it('should exit with code 1 when title is missing', async () => {
      const result = await executeCli(
        [
          'add',
          '-a', 'Author Without Title',
          '-d', 'Description',
          '-T', 'technical',
          '-f', 'pdf',
          '-c', 'Testing',
        ],
        { cwd: cliCwd }
      );

      expect(result.exitCode).toBe(1);
      expect(result.stderr.toLowerCase()).toContain('title');
    });

    it('should exit with code 1 when author is missing', async () => {
      const result = await executeCli(
        [
          'add',
          '-t', 'Book Without Author',
          '-d', 'Description',
          '-T', 'technical',
          '-f', 'pdf',
          '-c', 'Testing',
        ],
        { cwd: cliCwd }
      );

      expect(result.exitCode).toBe(1);
      expect(result.stderr.toLowerCase()).toContain('author');
    });

    it('should exit with code 1 when description is missing', async () => {
      const result = await executeCli(
        [
          'add',
          '-t', 'Book Without Description',
          '-a', 'Author',
          '-T', 'technical',
          '-f', 'pdf',
          '-c', 'Testing',
        ],
        { cwd: cliCwd }
      );

      expect(result.exitCode).toBe(1);
      expect(result.stderr.toLowerCase()).toContain('description');
    });

    it('should exit with code 1 when type is missing', async () => {
      const result = await executeCli(
        [
          'add',
          '-t', 'Book Without Type',
          '-a', 'Author',
          '-d', 'Description',
          '-f', 'pdf',
          '-c', 'Testing',
        ],
        { cwd: cliCwd }
      );

      expect(result.exitCode).toBe(1);
      expect(result.stderr.toLowerCase()).toContain('type');
    });

    it('should exit with code 1 when format is missing', async () => {
      const result = await executeCli(
        [
          'add',
          '-t', 'Book Without Format',
          '-a', 'Author',
          '-d', 'Description',
          '-T', 'technical',
          '-c', 'Testing',
        ],
        { cwd: cliCwd }
      );

      expect(result.exitCode).toBe(1);
      expect(result.stderr.toLowerCase()).toContain('format');
    });

    it('should exit with code 1 when categories is missing', async () => {
      const result = await executeCli(
        [
          'add',
          '-t', 'Book Without Categories',
          '-a', 'Author',
          '-d', 'Description',
          '-T', 'technical',
          '-f', 'pdf',
        ],
        { cwd: cliCwd }
      );

      expect(result.exitCode).toBe(1);
      expect(result.stderr.toLowerCase()).toContain('categories');
    });
  });

  // Tests for ISBN duplicate - triad duplicate detection was removed with multi-author model
  describe('Duplicate Detection', () => {
    it('should exit with code 1 when ISBN already exists', async () => {
      const isbn = generateUniqueISBN();

      // First book with ISBN
      const result1 = await executeCli(
        [
          'add',
          '-t', 'First ISBN Book',
          '-a', 'First Author',
          '-d', 'First book with this ISBN.',
          '-T', 'technical',
          '-f', 'pdf',
          '-c', 'Testing',
          '--isbn', isbn,
        ],
        { cwd: cliCwd }
      );
      expect(result1.exitCode).toBe(0);

      // Second book with same ISBN
      const result2 = await executeCli(
        [
          'add',
          '-t', 'Second ISBN Book',
          '-a', 'Second Author',
          '-d', 'Second book with same ISBN.',
          '-T', 'novel',
          '-f', 'epub',
          '-c', 'Testing',
          '--isbn', isbn,
        ],
        { cwd: cliCwd }
      );

      expect(result2.exitCode).toBe(1);
      expect(result2.stderr.toLowerCase()).toContain('isbn');
    });

    it('should allow same title/author/format without ISBN (no triad check)', async () => {
      // With multi-author model, triad duplicate detection has been removed
      // First book
      const result1 = await executeCli(
        [
          'add',
          '-t', 'CLI Triad Book',
          '-a', 'CLI Triad Author',
          '-d', 'First book with this triad.',
          '-T', 'technical',
          '-f', 'pdf',
          '-c', 'Testing',
        ],
        { cwd: cliCwd }
      );
      expect(result1.exitCode).toBe(0);

      // Second book with same author/title/format triad - should succeed now
      const result2 = await executeCli(
        [
          'add',
          '-t', 'CLI Triad Book',
          '-a', 'CLI Triad Author',
          '-d', 'Second book with same triad.',
          '-T', 'novel',
          '-f', 'pdf',
          '-c', 'Other Category',
        ],
        { cwd: cliCwd }
      );

      // Should now succeed (exit 0) instead of failing
      expect(result2.exitCode).toBe(0);
    });
  });

  describe('Invalid Input Values', () => {
    it('should exit with code 1 when type is invalid', async () => {
      const result = await executeCli(
        [
          'add',
          '-t', 'Invalid Type Book',
          '-a', 'Author',
          '-d', 'Description',
          '-T', 'nonexistent_type',
          '-f', 'pdf',
          '-c', 'Testing',
        ],
        { cwd: cliCwd }
      );

      expect(result.exitCode).toBe(1);
    });

    it('should exit with code 1 when format is invalid', async () => {
      const result = await executeCli(
        [
          'add',
          '-t', 'Invalid Format Book',
          '-a', 'Author',
          '-d', 'Description',
          '-T', 'technical',
          '-f', 'invalid_format',
          '-c', 'Testing',
        ],
        { cwd: cliCwd }
      );

      expect(result.exitCode).toBe(1);
    });

    it('should exit with code 1 when ISBN format is invalid', async () => {
      const result = await executeCli(
        [
          'add',
          '-t', 'Invalid ISBN Book',
          '-a', 'Author',
          '-d', 'Description',
          '-T', 'technical',
          '-f', 'pdf',
          '-c', 'Testing',
          '--isbn', 'not-a-valid-isbn',
        ],
        { cwd: cliCwd }
      );

      expect(result.exitCode).toBe(1);
    });
  });

  describe('Service Errors', () => {
    // Note: Testing embedding service unavailability requires stopping Ollama
    // This is skipped to avoid affecting other tests
    it.skip('should exit with code 1 when embedding service is unavailable', async () => {
      // Would require stopping Ollama container
    });
  });

  describe('Help and Version', () => {
    it('should display help when --help flag is used', async () => {
      const result = await executeCli(['add', '--help'], { cwd: cliCwd });

      // Commander exits with 0 for --help
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Add a new book');
      expect(result.stdout).toContain('--title');
      expect(result.stdout).toContain('--author');
    });

    it('should display version when --version flag is used on main command', async () => {
      const result = await executeCli(['--version'], { cwd: cliCwd });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
    });
  });
});
