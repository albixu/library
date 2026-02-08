/**
 * CreateBookUseCase
 *
 * Application service that orchestrates the book creation process.
 * This use case coordinates between domain entities and infrastructure ports.
 *
 * Flow:
 * 1. Validate input fields (title, author, type, format, isbn, description)
 * 2. Check for duplicates using normalized fields
 * 3. Resolve/create categories (only after duplicate check passes)
 * 4. Create Book entity with validated fields and categories
 * 5. Generate embedding from book text
 * 6. Persist book with embedding atomically
 */

import { Book } from '../../domain/entities/Book.js';
import { BookType } from '../../domain/value-objects/BookType.js';
import { BookFormat } from '../../domain/value-objects/BookFormat.js';
import { ISBN } from '../../domain/value-objects/ISBN.js';
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
 * 
 * Defense-in-depth guard: With current domain constraints (Book: title 500 + author 300 + 
 * description 5000 + max 10 categories × 100 chars each), the maximum possible embedding 
 * text is ~6812 characters, making this 7000-char limit currently unreachable.
 * 
 * This guard is intentionally kept as a safety mechanism to prevent future issues if:
 * - Domain constraints are relaxed (e.g., longer descriptions, more categories)
 * - New fields are added to the embedding text
 * - External integrations provide data that bypasses normal validation
 * 
 * This prevents expensive embedding service calls that would fail anyway, and provides
 * a clear error message at the application layer rather than propagating provider-specific
 * errors from the infrastructure layer.
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
    // 1. Validate and normalize fields needed for duplicate detection
    //    This provides early validation and normalization without persisting anything
    const bookType = BookType.create(input.type);
    const bookFormat = BookFormat.create(input.format);
    const bookIsbn = input.isbn ? ISBN.create(input.isbn) : null;

    // 2. Check for duplicates BEFORE creating any resources
    //    This prevents orphaned categories if the book is a duplicate
    //    Title and author are trimmed to match Book.create()'s normalization
    const duplicateCheck = await this.bookRepository.checkDuplicate({
      isbn: bookIsbn?.value ?? null,
      author: input.author.trim(),
      title: input.title.trim(),
      format: bookFormat.value,
    });

    if (duplicateCheck.isDuplicate) {
      if (duplicateCheck.duplicateType === 'isbn' && bookIsbn) {
        throw new DuplicateISBNError(bookIsbn.value);
      } else if (duplicateCheck.duplicateType === 'triad') {
        throw new DuplicateBookError(
          input.author.trim(),
          input.title.trim(),
          bookFormat.value
        );
      }
      // Fallback for unexpected duplicate types (should not happen with current implementation)
      throw new Error(`Unexpected duplicate type: ${duplicateCheck.duplicateType}`);
    }

    // 3. Resolve or create categories (only after duplicate check passes)
    const categories = await this.categoryRepository.findOrCreateMany(
      input.categoryNames
    );

    // 4. Create Book entity with validated fields and categories
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

    // 5. Generate embedding text and validate length
    const embeddingText = book.getTextForEmbedding();

    if (embeddingText.length > MAX_EMBEDDING_TEXT_LENGTH) {
      throw new EmbeddingTextTooLongError(
        embeddingText.length,
        MAX_EMBEDDING_TEXT_LENGTH
      );
    }

    // 6. Generate embedding (may throw EmbeddingServiceUnavailableError)
    const embeddingResult = await this.embeddingService.generateEmbedding(
      embeddingText
    );

    // 7. Persist book with embedding atomically
    const savedBook = await this.bookRepository.save({
      book,
      embedding: embeddingResult.embedding,
    });

    // 8. Return output DTO
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
