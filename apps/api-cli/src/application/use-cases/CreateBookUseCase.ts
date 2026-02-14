/**
 * CreateBookUseCase
 *
 * Application service that orchestrates the book creation process.
 * This use case coordinates between domain entities and infrastructure ports.
 *
 * Flow:
 * 1. Validate input fields (title, authors, type, format, isbn, description)
 * 2. Validate type exists in database via TypeRepository
 * 3. Check for ISBN duplicates (triad check removed with multi-author model)
 * 4. Resolve/create categories (only after duplicate check passes)
 * 5. Resolve/create authors via AuthorRepository
 * 6. Create Book entity with validated fields, type, authors, and categories
 * 7. Generate embedding from book text
 * 8. Persist book with embedding atomically
 */

import { Book } from '../../domain/entities/Book.js';
import { BookFormat } from '../../domain/value-objects/BookFormat.js';
import { ISBN } from '../../domain/value-objects/ISBN.js';
import { DEFAULT_BOOK_TYPES } from '../../domain/entities/BookType.js';
import { generateUUID } from '../../shared/utils/uuid.js';
import type { BookRepository } from '../ports/BookRepository.js';
import type { CategoryRepository } from '../ports/CategoryRepository.js';
import type { TypeRepository } from '../ports/TypeRepository.js';
import type { AuthorRepository } from '../ports/AuthorRepository.js';
import type { EmbeddingService } from '../ports/EmbeddingService.js';
import type { Logger } from '../ports/Logger.js';
import { noopLogger } from '../ports/Logger.js';
import {
  EmbeddingTextTooLongError,
} from '../errors/ApplicationErrors.js';
import {
  DuplicateISBNError,
  InvalidBookTypeError,
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
  authors: string[];
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
  authors: Array<{ id: string; name: string }>;
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
  typeRepository: TypeRepository;
  authorRepository: AuthorRepository;
  embeddingService: EmbeddingService;
  logger?: Logger;
}

/**
 * CreateBookUseCase
 *
 * Orchestrates the complete book creation flow including:
 * - Input validation (delegated to Book entity)
 * - Type validation against database
 * - ISBN duplicate detection (triad check removed with multi-author model)
 * - Category auto-creation
 * - Author auto-creation
 * - Embedding generation
 * - Atomic persistence
 */
export class CreateBookUseCase {
  private readonly bookRepository: BookRepository;
  private readonly categoryRepository: CategoryRepository;
  private readonly typeRepository: TypeRepository;
  private readonly authorRepository: AuthorRepository;
  private readonly embeddingService: EmbeddingService;
  private readonly logger: Logger;

  constructor(deps: CreateBookUseCaseDeps) {
    this.bookRepository = deps.bookRepository;
    this.categoryRepository = deps.categoryRepository;
    this.typeRepository = deps.typeRepository;
    this.authorRepository = deps.authorRepository;
    this.embeddingService = deps.embeddingService;
    this.logger = deps.logger?.child({ name: 'CreateBookUseCase' }) ?? noopLogger;
  }

  /**
   * Executes the book creation use case
   *
   * @param input - The book data to create
   * @returns Promise resolving to the created book output
   * @throws InvalidBookTypeError if the type does not exist in the database
   * @throws DuplicateISBNError if a book with the same ISBN already exists
   * @throws EmbeddingTextTooLongError if embedding text exceeds 7000 chars
   * @throws EmbeddingServiceUnavailableError if embedding service is down
   * @throws DomainError for validation failures
   */
  async execute(input: CreateBookInput): Promise<CreateBookOutput> {
    this.logger.debug('Starting book creation', {
      title: input.title,
      authors: input.authors,
      isbn: input.isbn ?? null,
      categoryCount: input.categoryNames.length,
    });

    // 1. Validate and normalize fields needed for duplicate detection
    //    This provides early validation and normalization without persisting anything
    const bookFormat = BookFormat.create(input.format);
    const bookIsbn = input.isbn ? ISBN.create(input.isbn) : null;

    // 2. Validate type exists in database
    const bookType = await this.typeRepository.findByName(input.type);
    if (!bookType) {
      this.logger.warn('Invalid book type', { type: input.type });
      throw new InvalidBookTypeError(input.type, DEFAULT_BOOK_TYPES);
    }

    // 3. Check for ISBN duplicates BEFORE creating any resources
    //    This prevents orphaned categories if the book is a duplicate
    //    NOTE: Triad check (author+title+format) was removed with multi-author model
    //    because comparing "same authors" with N:M relationships is complex and ambiguous
    const duplicateCheck = await this.bookRepository.checkDuplicate({
      isbn: bookIsbn?.value ?? null,
    });

    if (duplicateCheck.isDuplicate) {
      if (duplicateCheck.duplicateType === 'isbn' && bookIsbn) {
        this.logger.warn('Duplicate ISBN detected', {
          isbn: bookIsbn.value,
        });
        throw new DuplicateISBNError(bookIsbn.value);
      }
      // Fallback for unexpected duplicate types (should not happen with current implementation)
      throw new Error(`Unexpected duplicate type: ${duplicateCheck.duplicateType}`);
    }

    // 4. Resolve or create categories (only after duplicate check passes)
    const categories = await this.categoryRepository.findOrCreateMany(
      input.categoryNames
    );

    this.logger.debug('Categories resolved', {
      categories: categories.map((c) => c.name),
    });

    // 5. Resolve or create authors via AuthorRepository
    const authorEntities = await this.authorRepository.findOrCreateMany(input.authors);

    this.logger.debug('Authors resolved', {
      authors: authorEntities.map(a => ({ id: a.id, name: a.name })),
    });

    // 6. Create Book entity with validated fields, type, authors, and categories
    const book = Book.create({
      id: generateUUID(),
      title: input.title,
      authors: authorEntities,
      description: input.description,
      type: bookType,
      categories,
      format: input.format,
      isbn: input.isbn,
      available: input.available,
      path: input.path,
    });

    // 7. Generate embedding text and validate length
    const embeddingText = book.getTextForEmbedding();

    if (embeddingText.length > MAX_EMBEDDING_TEXT_LENGTH) {
      this.logger.error('Embedding text too long', {
        actualLength: embeddingText.length,
        maxLength: MAX_EMBEDDING_TEXT_LENGTH,
      });
      throw new EmbeddingTextTooLongError(
        embeddingText.length,
        MAX_EMBEDDING_TEXT_LENGTH
      );
    }

    // 8. Generate embedding (may throw EmbeddingServiceUnavailableError)
    this.logger.debug('Generating embedding', {
      textLength: embeddingText.length,
    });

    let embeddingResult;
    try {
      embeddingResult = await this.embeddingService.generateEmbedding(
        embeddingText
      );
    } catch (error) {
      this.logger.error('Embedding generation failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }

    // 9. Persist book with embedding atomically
    const savedBook = await this.bookRepository.save({
      book,
      embedding: embeddingResult.embedding,
    });

    this.logger.info('Book created successfully', {
      bookId: savedBook.id,
      title: savedBook.title,
      authors: savedBook.authors.map(a => a.name),
    });

    // 10. Return output DTO
    return this.toOutput(savedBook);
  }

  /**
   * Converts a Book entity to the output DTO
   */
  private toOutput(book: Book): CreateBookOutput {
    return {
      id: book.id,
      title: book.title,
      authors: book.authors.map((a) => ({ id: a.id, name: a.name })),
      description: book.description,
      type: book.type.name, // BookType entity has .name property
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
