/**
 * CreateBookUseCase
 *
 * Application service that orchestrates the book creation process.
 * This use case coordinates between domain entities and infrastructure ports.
 *
 * Flow:
 * 1. Validate input
 * 2. Resolve/create categories
 * 3. Create Book entity and check for duplicates (ISBN and triad)
 * 4. Generate embedding from book text
 * 5. Persist book with embedding atomically
 */

import { Book } from '../../domain/entities/Book.js';
import { generateUUID } from '../../shared/utils/uuid.js';
import type { BookRepository } from '../ports/BookRepository.js';
import type { CategoryRepository } from '../ports/CategoryRepository.js';
import type { EmbeddingService } from '../ports/EmbeddingService.js';
import {
  EmbeddingTextTooLongError,
} from '../errors/ApplicationErrors.js';
import {
  DuplicateISBNError,
  DuplicateBookError,
} from '../../domain/errors/DomainErrors.js';

/**
 * Maximum length for embedding text (concatenation of book fields)
 */
const MAX_EMBEDDING_TEXT_LENGTH = 7000;

/**
 * Input DTO for creating a book
 */
export interface CreateBookInput {
  title: string;
  author: string;
  description: string;
  type: string;
  categoryNames: string[];
  format: string;
  isbn?: string | null;
  available?: boolean;
  path?: string | null;
}

/**
 * Output DTO for created book
 */
export interface CreateBookOutput {
  id: string;
  title: string;
  author: string;
  description: string;
  type: string;
  categories: Array<{ id: string; name: string }>;
  format: string;
  isbn: string | null;
  available: boolean;
  path: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Dependencies required by CreateBookUseCase
 */
export interface CreateBookUseCaseDeps {
  bookRepository: BookRepository;
  categoryRepository: CategoryRepository;
  embeddingService: EmbeddingService;
}

/**
 * CreateBookUseCase
 *
 * Orchestrates the complete book creation flow including:
 * - Input validation (delegated to Book entity)
 * - Duplicate detection (ISBN and author+title+format triad)
 * - Category auto-creation
 * - Embedding generation
 * - Atomic persistence
 */
export class CreateBookUseCase {
  private readonly bookRepository: BookRepository;
  private readonly categoryRepository: CategoryRepository;
  private readonly embeddingService: EmbeddingService;

  constructor(deps: CreateBookUseCaseDeps) {
    this.bookRepository = deps.bookRepository;
    this.categoryRepository = deps.categoryRepository;
    this.embeddingService = deps.embeddingService;
  }

  /**
   * Executes the book creation use case
   *
   * @param input - The book data to create
   * @returns Promise resolving to the created book output
   * @throws DuplicateISBNError if a book with the same ISBN already exists
   * @throws DuplicateBookError if a book with the same author, title, and format already exists
   * @throws EmbeddingTextTooLongError if embedding text exceeds 7000 chars
   * @throws EmbeddingServiceUnavailableError if embedding service is down
   * @throws DomainError for validation failures
   */
  async execute(input: CreateBookInput): Promise<CreateBookOutput> {
    // 1. Resolve or create categories
    const categories = await this.categoryRepository.findOrCreateMany(
      input.categoryNames
    );

    // 2. Create Book entity (validates all fields)
    const book = Book.create({
      id: generateUUID(),
      title: input.title,
      author: input.author,
      description: input.description,
      type: input.type,
      categories,
      format: input.format,
      isbn: input.isbn,
      available: input.available,
      path: input.path,
    });

    // 3. Check for duplicates
    const normalizedAuthor = book.author.trim().toLowerCase();
    const normalizedTitle = book.title.trim().toLowerCase();
    const duplicateCheck = await this.bookRepository.checkDuplicate({
      isbn: book.isbn?.value ?? null,
      author: normalizedAuthor,
      title: normalizedTitle,
      format: book.format.value,
    });

    if (duplicateCheck.isDuplicate) {
      if (duplicateCheck.duplicateType === 'isbn') {
        throw new DuplicateISBNError(book.isbn!.value);
      } else if (duplicateCheck.duplicateType === 'triad') {
        throw new DuplicateBookError(normalizedAuthor, normalizedTitle, book.format.value);
      }
      // Fallback for any unexpected cases (should never be reached in normal operation)
      throw new Error(
        `Unexpected duplicate type encountered: ${duplicateCheck.duplicateType ?? 'unknown'}. ${duplicateCheck.message ?? 'Duplicate book found'}`
      );
    }

    // 4. Generate embedding text and validate length
    const embeddingText = book.getTextForEmbedding();

    if (embeddingText.length > MAX_EMBEDDING_TEXT_LENGTH) {
      throw new EmbeddingTextTooLongError(
        embeddingText.length,
        MAX_EMBEDDING_TEXT_LENGTH
      );
    }

    // 5. Generate embedding (may throw EmbeddingServiceUnavailableError)
    const embeddingResult = await this.embeddingService.generateEmbedding(
      embeddingText
    );

    // 6. Persist book with embedding atomically
    const savedBook = await this.bookRepository.save({
      book,
      embedding: embeddingResult.embedding,
    });

    // 7. Return output DTO
    return this.toOutput(savedBook);
  }

  /**
   * Converts a Book entity to the output DTO
   */
  private toOutput(book: Book): CreateBookOutput {
    return {
      id: book.id,
      title: book.title,
      author: book.author,
      description: book.description,
      type: book.type.value,
      categories: book.categories.map((c) => ({ id: c.id, name: c.name })),
      format: book.format.value,
      isbn: book.isbn?.value ?? null,
      available: book.available,
      path: book.path,
      createdAt: book.createdAt,
      updatedAt: book.updatedAt,
    };
  }
}
