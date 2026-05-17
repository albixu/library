/**
 * Unit Tests: SendBookByEmailUseCase
 *
 * Tests for the use case that sends a book file to a recipient via email.
 * HU-036: Send book by email feature.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SendBookByEmailUseCase } from '../../../../src/application/use-cases/SendBookByEmailUseCase.js';
import { Book } from '../../../../src/domain/entities/Book.js';
import { BookType } from '../../../../src/domain/entities/BookType.js';
import { Author } from '../../../../src/domain/entities/Author.js';
import { InvalidEmailAddressError } from '../../../../src/domain/value-objects/EmailAddress.js';
import {
  BookNotFoundError,
  BookFileNotFoundError,
} from '../../../../src/domain/errors/DomainErrors.js';
import type { BookRepository } from '../../../../src/application/ports/BookRepository.js';
import type { FileSystemPort } from '../../../../src/application/ports/FileSystemPort.js';
import type { EmailPort } from '../../../../src/application/ports/EmailPort.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const bookType = BookType.fromPersistence({
  id: '550e8400-e29b-41d4-a716-446655440001',
  name: 'technical',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
});

const author = Author.fromPersistence({
  id: '660e8400-e29b-41d4-a716-446655440001',
  name: 'Robert C. Martin',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
});

function makeBook(overrides: Partial<{ path: string | null }> = {}): Book {
  return Book.fromPersistence({
    id: '770e8400-e29b-41d4-a716-446655440001',
    title: 'Clean Code',
    authors: [author],
    type: bookType,
    categories: [],
    format: 'epub',
    isbn: null,
    levelId: null,
    originalDescription: 'A handbook of agile software craftsmanship.',
    description: 'Un manual de artesanía de software ágil.',
    language: 'en',
    available: true,
    path: overrides.path !== undefined ? overrides.path : 'clean-code.epub',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SendBookByEmailUseCase', () => {
  let mockBookRepository: BookRepository;
  let mockFileSystemPort: FileSystemPort;
  let mockEmailPort: EmailPort;
  let useCase: SendBookByEmailUseCase;

  beforeEach(() => {
    mockBookRepository = {
      findById: vi.fn(),
      findByIsbn: vi.fn(),
      existsByIsbn: vi.fn(),
      checkDuplicate: vi.fn(),
      save: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findAll: vi.fn(),
      count: vi.fn(),
      search: vi.fn(),
    };

    mockFileSystemPort = {
      fileExists: vi.fn(),
    };

    mockEmailPort = {
      sendWithAttachment: vi.fn(),
    };

    useCase = new SendBookByEmailUseCase({
      bookRepository: mockBookRepository,
      fileSystemPort: mockFileSystemPort,
      emailPort: mockEmailPort,
      booksMountPath: '/books',
    });
  });

  // -------------------------------------------------------------------------
  // Email validation
  // -------------------------------------------------------------------------

  describe('email validation', () => {
    it('should throw InvalidEmailAddressError when email is empty', async () => {
      await expect(
        useCase.execute({ bookId: 'any-id', email: '' }),
      ).rejects.toThrow(InvalidEmailAddressError);
    });

    it('should throw InvalidEmailAddressError when email has no @', async () => {
      await expect(
        useCase.execute({ bookId: 'any-id', email: 'notanemail' }),
      ).rejects.toThrow(InvalidEmailAddressError);
    });

    it('should throw InvalidEmailAddressError when email is malformed', async () => {
      await expect(
        useCase.execute({ bookId: 'any-id', email: 'bad@' }),
      ).rejects.toThrow(InvalidEmailAddressError);
    });

    it('should not call the repository when the email is invalid', async () => {
      await expect(
        useCase.execute({ bookId: 'any-id', email: 'invalid' }),
      ).rejects.toThrow(InvalidEmailAddressError);

      expect(mockBookRepository.findById).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Book lookup
  // -------------------------------------------------------------------------

  describe('book lookup', () => {
    it('should throw BookNotFoundError when the book does not exist', async () => {
      vi.mocked(mockBookRepository.findById).mockResolvedValue(null);

      await expect(
        useCase.execute({ bookId: 'missing-id', email: 'user@example.com' }),
      ).rejects.toThrow(BookNotFoundError);
    });

    it('should call findById with the given bookId', async () => {
      vi.mocked(mockBookRepository.findById).mockResolvedValue(null);

      await expect(
        useCase.execute({ bookId: 'target-id', email: 'user@example.com' }),
      ).rejects.toThrow(BookNotFoundError);

      expect(mockBookRepository.findById).toHaveBeenCalledWith('target-id');
    });
  });

  // -------------------------------------------------------------------------
  // File checks
  // -------------------------------------------------------------------------

  describe('file existence checks', () => {
    it('should throw BookFileNotFoundError when the book has no path', async () => {
      vi.mocked(mockBookRepository.findById).mockResolvedValue(makeBook({ path: null }));

      await expect(
        useCase.execute({ bookId: 'book-id', email: 'user@example.com' }),
      ).rejects.toThrow(BookFileNotFoundError);
    });

    it('should not call fileExists when the book has no path', async () => {
      vi.mocked(mockBookRepository.findById).mockResolvedValue(makeBook({ path: null }));

      await expect(
        useCase.execute({ bookId: 'book-id', email: 'user@example.com' }),
      ).rejects.toThrow(BookFileNotFoundError);

      expect(mockFileSystemPort.fileExists).not.toHaveBeenCalled();
    });

    it('should throw BookFileNotFoundError when the file does not exist on disk', async () => {
      vi.mocked(mockBookRepository.findById).mockResolvedValue(makeBook());
      vi.mocked(mockFileSystemPort.fileExists).mockResolvedValue(false);

      await expect(
        useCase.execute({ bookId: 'book-id', email: 'user@example.com' }),
      ).rejects.toThrow(BookFileNotFoundError);
    });

    it('should call fileExists with the correct absolute path', async () => {
      vi.mocked(mockBookRepository.findById).mockResolvedValue(makeBook({ path: 'clean-code.epub' }));
      vi.mocked(mockFileSystemPort.fileExists).mockResolvedValue(false);

      await expect(
        useCase.execute({ bookId: 'book-id', email: 'user@example.com' }),
      ).rejects.toThrow(BookFileNotFoundError);

      expect(mockFileSystemPort.fileExists).toHaveBeenCalledWith('/books/clean-code.epub');
    });
  });

  // -------------------------------------------------------------------------
  // Happy path
  // -------------------------------------------------------------------------

  describe('happy path', () => {
    it('should send the email with correct options', async () => {
      vi.mocked(mockBookRepository.findById).mockResolvedValue(makeBook({ path: 'clean-code.epub' }));
      vi.mocked(mockFileSystemPort.fileExists).mockResolvedValue(true);
      vi.mocked(mockEmailPort.sendWithAttachment).mockResolvedValue(undefined);

      await useCase.execute({ bookId: 'book-id', email: 'user@example.com' });

      expect(mockEmailPort.sendWithAttachment).toHaveBeenCalledWith({
        to: 'user@example.com',
        subject: '[Library] Clean Code',
        body: expect.stringContaining('Clean Code'),
        attachmentPath: '/books/clean-code.epub',
        attachmentFilename: 'clean-code.epub',
      });
    });

    it('should include the author name in the email body', async () => {
      vi.mocked(mockBookRepository.findById).mockResolvedValue(makeBook());
      vi.mocked(mockFileSystemPort.fileExists).mockResolvedValue(true);
      vi.mocked(mockEmailPort.sendWithAttachment).mockResolvedValue(undefined);

      await useCase.execute({ bookId: 'book-id', email: 'user@example.com' });

      const callArg = vi.mocked(mockEmailPort.sendWithAttachment).mock.calls[0][0];
      expect(callArg.body).toContain('Robert C. Martin');
    });

    it('should resolve without error when everything succeeds', async () => {
      vi.mocked(mockBookRepository.findById).mockResolvedValue(makeBook());
      vi.mocked(mockFileSystemPort.fileExists).mockResolvedValue(true);
      vi.mocked(mockEmailPort.sendWithAttachment).mockResolvedValue(undefined);

      await expect(
        useCase.execute({ bookId: 'book-id', email: 'user@example.com' }),
      ).resolves.toBeUndefined();
    });

    it('should use the trimmed & lowercased email from EmailAddress VO', async () => {
      vi.mocked(mockBookRepository.findById).mockResolvedValue(makeBook());
      vi.mocked(mockFileSystemPort.fileExists).mockResolvedValue(true);
      vi.mocked(mockEmailPort.sendWithAttachment).mockResolvedValue(undefined);

      await useCase.execute({ bookId: 'book-id', email: '  user@example.com  ' });

      const callArg = vi.mocked(mockEmailPort.sendWithAttachment).mock.calls[0][0];
      expect(callArg.to).toBe('user@example.com');
    });
  });

  // -------------------------------------------------------------------------
  // booksMountPath configuration
  // -------------------------------------------------------------------------

  describe('booksMountPath configuration', () => {
    it('should default to /books when no booksMountPath is provided', async () => {
      const useCaseDefault = new SendBookByEmailUseCase({
        bookRepository: mockBookRepository,
        fileSystemPort: mockFileSystemPort,
        emailPort: mockEmailPort,
      });

      vi.mocked(mockBookRepository.findById).mockResolvedValue(makeBook({ path: 'book.epub' }));
      vi.mocked(mockFileSystemPort.fileExists).mockResolvedValue(true);
      vi.mocked(mockEmailPort.sendWithAttachment).mockResolvedValue(undefined);

      await useCaseDefault.execute({ bookId: 'book-id', email: 'user@example.com' });

      expect(mockFileSystemPort.fileExists).toHaveBeenCalledWith('/books/book.epub');
    });

    it('should use a custom booksMountPath when provided', async () => {
      const useCaseCustom = new SendBookByEmailUseCase({
        bookRepository: mockBookRepository,
        fileSystemPort: mockFileSystemPort,
        emailPort: mockEmailPort,
        booksMountPath: '/custom/library',
      });

      vi.mocked(mockBookRepository.findById).mockResolvedValue(makeBook({ path: 'book.epub' }));
      vi.mocked(mockFileSystemPort.fileExists).mockResolvedValue(true);
      vi.mocked(mockEmailPort.sendWithAttachment).mockResolvedValue(undefined);

      await useCaseCustom.execute({ bookId: 'book-id', email: 'user@example.com' });

      expect(mockFileSystemPort.fileExists).toHaveBeenCalledWith('/custom/library/book.epub');
      expect(vi.mocked(mockEmailPort.sendWithAttachment).mock.calls[0][0].attachmentPath).toBe(
        '/custom/library/book.epub',
      );
    });
  });

  // -------------------------------------------------------------------------
  // Error propagation
  // -------------------------------------------------------------------------

  describe('error propagation', () => {
    it('should propagate errors thrown by emailPort.sendWithAttachment', async () => {
      vi.mocked(mockBookRepository.findById).mockResolvedValue(makeBook());
      vi.mocked(mockFileSystemPort.fileExists).mockResolvedValue(true);
      vi.mocked(mockEmailPort.sendWithAttachment).mockRejectedValue(
        new Error('SMTP connection refused'),
      );

      await expect(
        useCase.execute({ bookId: 'book-id', email: 'user@example.com' }),
      ).rejects.toThrow('SMTP connection refused');
    });

    it('should propagate errors thrown by bookRepository.findById', async () => {
      vi.mocked(mockBookRepository.findById).mockRejectedValue(new Error('DB unavailable'));

      await expect(
        useCase.execute({ bookId: 'book-id', email: 'user@example.com' }),
      ).rejects.toThrow('DB unavailable');
    });
  });
});
