/**
 * SendBookByEmailUseCase
 *
 * Application service that orchestrates sending a book file by email.
 *
 * Flow:
 * 1. Validate the recipient email address
 * 2. Find the book by its ID
 * 3. Ensure the book has a file path defined
 * 4. Build the absolute path using the configured books mount point
 * 5. Verify the file exists on the file system
 * 6. Send the email with the book file as attachment
 *
 * HU-036: Send book by email feature.
 */

import { posix as path } from 'node:path';
import { EmailAddress } from '../../domain/value-objects/EmailAddress.js';
import {
  BookNotFoundError,
  BookFileNotFoundError,
} from '../../domain/errors/DomainErrors.js';
import { UserId } from '../../domain/user/value-objects/UserId.js';
import { BookId } from '../../domain/book/value-objects/BookId.js';
import type { BookRepository } from '../ports/BookRepository.js';
import type { FileSystemPort } from '../ports/FileSystemPort.js';
import type { EmailPort } from '../ports/EmailPort.js';
import type { RegisterDownloadUseCase } from './download/RegisterDownloadUseCase.js';

/**
 * Input DTO for sending a book by email
 */
export interface SendBookByEmailInput {
  /** UUID of the book to send */
  bookId: string;
  /** Recipient email address */
  email: string;
  /** UUID of the authenticated user (optional — used to register the Kindle send as a download) */
  userId?: string;
}

/**
 * Dependencies required by SendBookByEmailUseCase
 */
export interface SendBookByEmailUseCaseDeps {
  bookRepository: BookRepository;
  fileSystemPort: FileSystemPort;
  emailPort: EmailPort;
  /**
   * Absolute path to the directory where books are stored.
   * Defaults to '/books' (the Docker volume mount point).
   */
  booksMountPath?: string;
  /**
   * Optional use case for registering the Kindle send as a download event.
   * When present, a download is recorded after every successful email delivery.
   */
  registerDownloadUseCase?: RegisterDownloadUseCase;
}

/**
 * SendBookByEmailUseCase
 *
 * Orchestrates the complete flow for sending a book file to a recipient via email.
 *
 * The books directory is injected via `booksMountPath` (default: '/books') so the
 * mount point is not hardcoded and can be overridden in tests or alternative deployments.
 */
export class SendBookByEmailUseCase {
  private readonly bookRepository: BookRepository;
  private readonly fileSystemPort: FileSystemPort;
  private readonly emailPort: EmailPort;
  private readonly booksMountPath: string;
  private readonly registerDownloadUseCase?: RegisterDownloadUseCase;

  constructor(deps: SendBookByEmailUseCaseDeps) {
    this.bookRepository = deps.bookRepository;
    this.fileSystemPort = deps.fileSystemPort;
    this.emailPort = deps.emailPort;
    this.booksMountPath = deps.booksMountPath ?? '/books';
    this.registerDownloadUseCase = deps.registerDownloadUseCase;
  }

  /**
   * Executes the send-book-by-email use case
   *
   * @param input - bookId and email of the recipient
   * @returns Promise resolving when the email has been sent
   * @throws InvalidEmailAddressError if the email is invalid
   * @throws BookNotFoundError if no book exists with the given ID
   * @throws BookFileNotFoundError if the book has no path or the file does not exist
   * @throws EmailSendError if the email could not be delivered
   */
  async execute({ bookId, email, userId }: SendBookByEmailInput): Promise<void> {
    // 1. Validate email — throws InvalidEmailAddressError if invalid
    const emailAddress = EmailAddress.create(email);

    // 2. Find book — throws BookNotFoundError if not found
    const book = await this.bookRepository.findById(bookId);
    if (!book) {
      throw new BookNotFoundError(bookId);
    }

    // 3. Ensure the book has a file path
    if (!book.path) {
      throw new BookFileNotFoundError(bookId);
    }

    // 4. Build absolute path inside the books mount point
    const fullPath = path.join(this.booksMountPath, book.path);

    // 5. Verify the file exists
    const exists = await this.fileSystemPort.fileExists(fullPath);
    if (!exists) {
      throw new BookFileNotFoundError(bookId);
    }

    // 6. Compose author line for the email body
    const authorNames = book.authors.map((a) => a.name).join(', ');

    // 7. Send the email with the book as attachment
    await this.emailPort.sendWithAttachment({
      to: emailAddress.value,
      subject: `[Library] ${book.title}`,
      body: `Aquí tenés el libro que pediste:\n\nTítulo: ${book.title}\nAutor/es: ${authorNames}`,
      attachmentPath: fullPath,
      attachmentFilename: path.basename(book.path),
    });

    // 8. Register the Kindle send as a download event (best-effort — never fails the request)
    if (this.registerDownloadUseCase && userId) {
      try {
        await this.registerDownloadUseCase.execute({
          userId: UserId.create(userId),
          bookId: BookId.create(bookId),
        });
      } catch {
        // Intentionally swallowed: registration failure must not affect the user
      }
    }
  }
}
