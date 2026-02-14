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
 *
 * TRANSITIONAL STATE:
 * The Book entity now uses `authors: Author[]` and `type: BookType` (entity),
 * but the API input still accepts `author: string` and `type: string`.
 * This use case creates temporary Author and BookType entities from the string inputs
 * until TASK-010 (full use case update) and the infrastructure layers are updated.
 */

import { Book } from '../../domain/entities/Book.js';
import { Author } from '../../domain/entities/Author.js';
import { BookType as BookTypeEntity } from '../../domain/entities/BookType.js';
import { BookType as BookTypeVO } from '../../domain/value-objects/BookType.js';
import { BookFormat } from '../../domain/value-objects/BookFormat.js';
import { ISBN } from '../../domain/value-objects/ISBN.js';
import { generateUUID } from '../../shared/utils/uuid.js';
import type { BookRepository } from '../ports/BookRepository.js';
import type { CategoryRepository } from '../ports/CategoryRepository.js';
import type { EmbeddingService } from '../ports/EmbeddingService.js';
import type { Logger } from '../ports/Logger.js';
import { noopLogger } from '../ports/Logger.js';
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
  logger?: Logger;
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
  private readonly logger: Logger;

  constructor(deps: CreateBookUseCaseDeps) {
    this.bookRepository = deps.bookRepository;
    this.categoryRepository = deps.categoryRepository;
    this.embeddingService = deps.embeddingService;
    this.logger = deps.logger?.child({ name: 'CreateBookUseCase' }) ?? noopLogger;
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
    this.logger.debug('Starting book creation', {
      title: input.title,
      author: input.author,
      isbn: input.isbn ?? null,
      categoryCount: input.categoryNames.length,
    });

    // 1. Validate and normalize fields needed for duplicate detection
    //    This provides early validation and normalization without persisting anything
    //    BookTypeVO is used for validation only (will throw InvalidBookTypeError if invalid)
    BookTypeVO.create(input.type);
    const bookFormat = BookFormat.create(input.format);
    const bookIsbn = input.isbn ? ISBN.create(input.isbn) : null;

    // 2. Check for duplicates BEFORE creating any resources
    //    This prevents orphaned categories if the book is a duplicate
    //    Title and author are normalized (trim + lowercase) per BookRepository contract
    const duplicateCheck = await this.bookRepository.checkDuplicate({
      isbn: bookIsbn?.value ?? null,
      author: input.author.trim().toLowerCase(),
      title: input.title.trim().toLowerCase(),
      format: bookFormat.value,
    });

    if (duplicateCheck.isDuplicate) {
      if (duplicateCheck.duplicateType === 'isbn' && bookIsbn) {
        this.logger.warn('Duplicate ISBN detected', {
          isbn: bookIsbn.value,
        });
        throw new DuplicateISBNError(bookIsbn.value);
      } else if (duplicateCheck.duplicateType === 'triad') {
        this.logger.warn('Duplicate book detected (author/title/format)', {
          author: input.author.trim(),
          title: input.title.trim(),
          format: bookFormat.value,
        });
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

    this.logger.debug('Categories resolved', {
      categories: categories.map((c) => c.name),
    });

    // 4. Create Author and BookType entities for the Book
    //    TRANSITIONAL: Creates temporary entities from string inputs.
    //    In TASK-010, this will use AuthorRepository.findOrCreate() and TypeRepository.findByName()
    const authorEntity = Author.create({
      id: generateUUID(),
      name: input.author,
    });

    const bookTypeEntity = BookTypeEntity.create({
      id: generateUUID(),
      name: input.type,
    });

    // 5. Create Book entity with validated fields and categories
    const book = Book.create({
      id: generateUUID(),
      title: input.title,
      authors: [authorEntity],
      description: input.description,
      type: bookTypeEntity,
      categories,
      format: input.format,
      isbn: input.isbn,
      available: input.available,
      path: input.path,
    });

    // 6. Generate embedding text and validate length
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

    // 7. Generate embedding (may throw EmbeddingServiceUnavailableError)
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

    // 8. Persist book with embedding atomically
    const savedBook = await this.bookRepository.save({
      book,
      embedding: embeddingResult.embedding,
    });

    this.logger.info('Book created successfully', {
      bookId: savedBook.id,
      title: savedBook.title,
      authors: savedBook.authors.map(a => a.name),
    });

    // 9. Return output DTO
    return this.toOutput(savedBook);
  }

  /**
   * Converts a Book entity to the output DTO
   *
   * TRANSITIONAL: Returns first author's name as 'author' string for backward compatibility.
   * In TASK-010, this will return 'authors' array matching the new API response format.
   */
  private toOutput(book: Book): CreateBookOutput {
    // TRANSITIONAL: Return first author's name for backward compatibility
    // Book.authors is guaranteed to have at least 1 element by domain validation
    const firstAuthor = book.authors[0];
    const authorName = firstAuthor?.name ?? '';

    return {
      id: book.id,
      title: book.title,
      author: authorName,
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
