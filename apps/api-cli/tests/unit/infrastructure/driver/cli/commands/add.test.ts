/**
 * Add Command Tests
 *
 * Unit tests for the CLI add command.
 * Uses mocked dependencies to test command behavior in isolation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAddCommand } from '../../../../../../src/infrastructure/driver/cli/commands/add.js';
import type { CreateBookUseCase, CreateBookOutput } from '../../../../../../src/application/use-cases/CreateBookUseCase.js';
import { DuplicateISBNError } from '../../../../../../src/domain/errors/DomainErrors.js';
import { EmbeddingServiceUnavailableError } from '../../../../../../src/application/errors/ApplicationErrors.js';
import { noopLogger } from '../../../../../../src/application/ports/Logger.js';

describe('AddCommand', () => {
  // Mock dependencies
  let mockCreateBookUseCase: CreateBookUseCase;
  let mockStdout: { write: ReturnType<typeof vi.fn> };
  let mockStderr: { write: ReturnType<typeof vi.fn> };
  let mockExit: ReturnType<typeof vi.fn>;

  const baseBook: CreateBookOutput = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    title: 'Clean Code',
    author: 'Robert C. Martin',
    description: 'A handbook of agile software craftsmanship',
    type: 'technical',
    format: 'pdf',
    categories: [
      { id: '1', name: 'programming' },
      { id: '2', name: 'software engineering' },
    ],
    isbn: '9780132350884',
    available: true,
    path: '/books/clean-code.pdf',
    createdAt: new Date('2026-02-08T12:00:00Z'),
    updatedAt: new Date('2026-02-08T12:00:00Z'),
  };

  beforeEach(() => {
    mockCreateBookUseCase = {
      execute: vi.fn().mockResolvedValue(baseBook),
    } as unknown as CreateBookUseCase;

    mockStdout = { write: vi.fn() };
    mockStderr = { write: vi.fn() };
    mockExit = vi.fn();
  });

  const createCommand = () =>
    createAddCommand({
      createBookUseCase: mockCreateBookUseCase,
      logger: noopLogger,
      stdout: mockStdout as unknown as NodeJS.WriteStream,
      stderr: mockStderr as unknown as NodeJS.WriteStream,
      exit: mockExit,
    });

  describe('successful book creation', () => {
    it('should call use case with parsed options', async () => {
      const command = createCommand();

      await command.parseAsync([
        'node',
        'cli',
        '-t', 'Clean Code',
        '-a', 'Robert C. Martin',
        '-d', 'A handbook of agile software craftsmanship',
        '-T', 'technical',
        '-f', 'pdf',
        '-c', 'programming,software engineering',
        '--isbn', '9780132350884',
        '-p', '/books/clean-code.pdf',
      ]);

      expect(mockCreateBookUseCase.execute).toHaveBeenCalledWith({
        title: 'Clean Code',
        author: 'Robert C. Martin',
        description: 'A handbook of agile software craftsmanship',
        type: 'technical',
        format: 'pdf',
        categoryNames: ['programming', 'software engineering'],
        isbn: '9780132350884',
        path: '/books/clean-code.pdf',
        available: true,
      });
    });

    it('should exit with code 0 on success', async () => {
      const command = createCommand();

      await command.parseAsync([
        'node', 'cli',
        '-t', 'Clean Code',
        '-a', 'Robert C. Martin',
        '-d', 'Description',
        '-T', 'technical',
        '-f', 'pdf',
        '-c', 'programming',
      ]);

      expect(mockExit).toHaveBeenCalledWith(0);
    });

    it('should write formatted output to stdout on success', async () => {
      const command = createCommand();

      await command.parseAsync([
        'node', 'cli',
        '-t', 'Clean Code',
        '-a', 'Robert C. Martin',
        '-d', 'Description',
        '-T', 'technical',
        '-f', 'pdf',
        '-c', 'programming',
      ]);

      expect(mockStdout.write).toHaveBeenCalled();
      const output = mockStdout.write.mock.calls[0][0];
      expect(output).toContain('✓');
      expect(output).toContain('Clean Code');
    });

    it('should handle categories with extra whitespace', async () => {
      const command = createCommand();

      await command.parseAsync([
        'node', 'cli',
        '-t', 'Test',
        '-a', 'Author',
        '-d', 'Desc',
        '-T', 'technical',
        '-f', 'pdf',
        '-c', ' programming , software engineering , ',
      ]);

      expect(mockCreateBookUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          categoryNames: ['programming', 'software engineering'],
        })
      );
    });

    it('should handle optional isbn and path', async () => {
      const command = createCommand();

      await command.parseAsync([
        'node', 'cli',
        '-t', 'Test',
        '-a', 'Author',
        '-d', 'Desc',
        '-T', 'novel',
        '-f', 'epub',
        '-c', 'fiction',
      ]);

      expect(mockCreateBookUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          isbn: undefined,
          path: undefined,
        })
      );
    });
  });

  describe('error handling', () => {
    it('should exit with code 1 on duplicate ISBN error', async () => {
      mockCreateBookUseCase.execute = vi.fn().mockRejectedValue(
        new DuplicateISBNError('9780132350884')
      );
      const command = createCommand();

      await command.parseAsync([
        'node', 'cli',
        '-t', 'Test',
        '-a', 'Author',
        '-d', 'Desc',
        '-T', 'technical',
        '-f', 'pdf',
        '-c', 'programming',
        '--isbn', '9780132350884',
      ]);

      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('should write error message to stderr on failure', async () => {
      mockCreateBookUseCase.execute = vi.fn().mockRejectedValue(
        new DuplicateISBNError('9780132350884')
      );
      const command = createCommand();

      await command.parseAsync([
        'node', 'cli',
        '-t', 'Test',
        '-a', 'Author',
        '-d', 'Desc',
        '-T', 'technical',
        '-f', 'pdf',
        '-c', 'programming',
        '--isbn', '9780132350884',
      ]);

      expect(mockStderr.write).toHaveBeenCalled();
      const errorOutput = mockStderr.write.mock.calls[0][0];
      expect(errorOutput).toContain('✗');
      expect(errorOutput).toContain('ISBN');
    });

    it('should exit with code 1 on embedding service error', async () => {
      mockCreateBookUseCase.execute = vi.fn().mockRejectedValue(
        new EmbeddingServiceUnavailableError('Connection refused')
      );
      const command = createCommand();

      await command.parseAsync([
        'node', 'cli',
        '-t', 'Test',
        '-a', 'Author',
        '-d', 'Desc',
        '-T', 'technical',
        '-f', 'pdf',
        '-c', 'programming',
      ]);

      expect(mockExit).toHaveBeenCalledWith(1);
      const errorOutput = mockStderr.write.mock.calls[0][0];
      expect(errorOutput).toContain('embeddings');
    });

    it('should handle unexpected errors gracefully', async () => {
      mockCreateBookUseCase.execute = vi.fn().mockRejectedValue(
        new Error('Unexpected database error')
      );
      const command = createCommand();

      await command.parseAsync([
        'node', 'cli',
        '-t', 'Test',
        '-a', 'Author',
        '-d', 'Desc',
        '-T', 'technical',
        '-f', 'pdf',
        '-c', 'programming',
      ]);

      expect(mockExit).toHaveBeenCalledWith(1);
      const errorOutput = mockStderr.write.mock.calls[0][0];
      expect(errorOutput).toContain('✗');
    });
  });

  describe('command configuration', () => {
    it('should have correct name', () => {
      const command = createCommand();
      expect(command.name()).toBe('add');
    });

    it('should have description', () => {
      const command = createCommand();
      expect(command.description()).toContain('Add');
    });

    it('should have all required options configured', () => {
      const command = createCommand();
      const options = command.options.map((o) => o.long);

      expect(options).toContain('--title');
      expect(options).toContain('--author');
      expect(options).toContain('--description');
      expect(options).toContain('--type');
      expect(options).toContain('--format');
      expect(options).toContain('--categories');
    });

    it('should have optional options configured', () => {
      const command = createCommand();
      const options = command.options.map((o) => o.long);

      expect(options).toContain('--isbn');
      expect(options).toContain('--path');
      expect(options).toContain('--available');
    });

    it('should have short aliases for main options', () => {
      const command = createCommand();
      const shorts = command.options
        .filter((o) => o.short)
        .map((o) => o.short);

      expect(shorts).toContain('-t');
      expect(shorts).toContain('-a');
      expect(shorts).toContain('-d');
      expect(shorts).toContain('-T');
      expect(shorts).toContain('-f');
      expect(shorts).toContain('-c');
      expect(shorts).toContain('-p');
    });
  });
});
