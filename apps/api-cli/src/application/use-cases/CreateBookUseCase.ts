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
 * 4. Resolve/create categories with type validation (only after duplicate check passes)
 * 5. Resolve/create level with type validation (if provided)
 * 6. Resolve/create authors via AuthorRepository
 * 7. Create Book entity with validated fields, type, authors, categories, and levelId
 * 8. Generate embedding from book text
 * 9. Persist book with embedding atomically
 *
 * HU-008: Categories and levels are now validated against the book's type.
 * - Categories must belong to the same type as the book
 * - Levels must be associated with the book's type
 */

import { Book } from '../../domain/entities/Book.js';
import { Level } from '../../domain/entities/Level.js';
import { BookFormat } from '../../domain/value-objects/BookFormat.js';
import { ISBN } from '../../domain/value-objects/ISBN.js';
import { DEFAULT_BOOK_TYPES } from '../../domain/entities/BookType.js';
import { generateUUID } from '../../shared/utils/uuid.js';
import type { BookRepository } from '../ports/BookRepository.js';
import type { CategoryRepository } from '../ports/CategoryRepository.js';
import type { TypeRepository } from '../ports/TypeRepository.js';
import type { AuthorRepository } from '../ports/AuthorRepository.js';
import type { LevelRepository } from '../ports/LevelRepository.js';
import type { EmbeddingService } from '../ports/EmbeddingService.js';
import type { Logger } from '../ports/Logger.js';
import { noopLogger } from '../ports/Logger.js';
import {
  DuplicateISBNError,
  InvalidBookTypeError,
  EmbeddingTextTooLongError,
  LevelTypeMismatchError,
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
 *
 * HU-008: level is now a level name (string) that will be resolved to a Level entity.
 * The levelId is stored in the Book, but the input accepts the level name for UX.
 *
 * HU-013: language field is required for translation support.
 * - language: ISO 639-1 code (e.g., 'en', 'es', 'fr')
 * - description will be stored in originalDescription
 * - Spanish description will be generated if language !== 'es'
 */
export interface CreateBookInput {
  title: string;
  authors: string[];
  description: string;
  language: string; // HU-013: ISO 639-1 code (required)
  type: string;
  categoryNames: string[];
  format: string;
  isbn?: string | null;
  level?: string | null; // Level name (not ID), will be validated against type
  available?: boolean;
  path?: string | null;
}

/**
 * Output DTO for created book
 *
 * HU-008: level now returns the level name (not ID) for consistency with type output.
 *
 * HU-013: Added originalDescription and language fields.
 * - originalDescription: description in the original language
 * - description: always in Spanish (translated if needed)
 * - language: ISO 639-1 code of the original language
 */
export interface CreateBookOutput {
  id: string;
  title: string;
  authors: { id: string; name: string }[];
  originalDescription: string; // HU-013
  description: string; // HU-013: Spanish description
  language: string; // HU-013: ISO 639-1 code
  type: string;
  categories: { id: string; name: string }[];
  format: string;
  isbn: string | null;
  level: string | null; // Level name for display, null if not set
  available: boolean;
  path: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Dependencies required by CreateBookUseCase
 *
 * HU-008: Added levelRepository for level validation and creation.
 */
export interface CreateBookUseCaseDeps {
  bookRepository: BookRepository;
  categoryRepository: CategoryRepository;
  typeRepository: TypeRepository;
  authorRepository: AuthorRepository;
  levelRepository: LevelRepository;
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
 * - Category validation/auto-creation with type scoping
 * - Level validation/auto-creation with type association
 * - Author auto-creation
 * - Embedding generation
 * - Atomic persistence
 *
 * HU-008: Now validates that categories and levels belong to the book's type.
 */
export class CreateBookUseCase {
  private readonly bookRepository: BookRepository;
  private readonly categoryRepository: CategoryRepository;
  private readonly typeRepository: TypeRepository;
  private readonly authorRepository: AuthorRepository;
  private readonly levelRepository: LevelRepository;
  private readonly embeddingService: EmbeddingService;
  private readonly logger: Logger;

  constructor(deps: CreateBookUseCaseDeps) {
    this.bookRepository = deps.bookRepository;
    this.categoryRepository = deps.categoryRepository;
    this.typeRepository = deps.typeRepository;
    this.authorRepository = deps.authorRepository;
    this.levelRepository = deps.levelRepository;
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
   * @throws LevelTypeMismatchError if the level is not valid for the book's type
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
      level: input.level ?? null,
    });

    // 1. Validate and normalize fields needed for duplicate detection
    //    This provides early validation and normalization without persisting anything
    BookFormat.create(input.format); // Validate format early (throws if invalid)
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

    // 4. Resolve or create categories with type validation (HU-008)
    //    Categories are now scoped to the book's type
    const categories = await this.categoryRepository.findOrCreateMany(
      input.categoryNames,
      bookType.id,
    );

    this.logger.debug('Categories resolved', {
      categories: categories.map((c) => c.name),
      typeId: bookType.id,
    });

    // 5. Resolve or create level with type validation (HU-008)
    let levelId: string | null = null;
    let levelName: string | null = null;

    if (input.level) {
      const resolvedLevel = await this.resolveLevel(input.level, bookType.id, bookType.name);
      levelId = resolvedLevel.id;
      levelName = resolvedLevel.name;

      this.logger.debug('Level resolved', {
        levelId,
        levelName,
        typeId: bookType.id,
      });
    }

    // 6. Resolve or create authors via AuthorRepository
    const authorEntities = await this.authorRepository.findOrCreateMany(input.authors);

    this.logger.debug('Authors resolved', {
      authors: authorEntities.map(a => ({ id: a.id, name: a.name })),
    });

    // 7. Create Book entity with validated fields, type, authors, categories, and levelId
    // HU-013: For now, we pass description as-is. Translation will be added in T05.
    // The Book entity stores description in originalDescription and uses it for description too.
    const book = Book.create({
      id: generateUUID(),
      title: input.title,
      authors: authorEntities,
      description: input.description,
      language: input.language, // HU-013
      type: bookType,
      categories,
      format: input.format,
      isbn: input.isbn,
      levelId, // HU-008: Now using levelId (UUID) instead of level (enum)
      available: input.available,
      path: input.path,
    });

    // 8. Generate embedding text and validate length
    const embeddingText = book.getTextForEmbedding();

    if (embeddingText.length > MAX_EMBEDDING_TEXT_LENGTH) {
      this.logger.error('Embedding text too long', {
        actualLength: embeddingText.length,
        maxLength: MAX_EMBEDDING_TEXT_LENGTH,
      });
      throw new EmbeddingTextTooLongError(
        embeddingText.length,
        MAX_EMBEDDING_TEXT_LENGTH,
      );
    }

    // 9. Generate embedding (may throw EmbeddingServiceUnavailableError)
    this.logger.debug('Generating embedding', {
      textLength: embeddingText.length,
    });

    let embeddingResult;
    try {
      embeddingResult = await this.embeddingService.generateEmbedding(
        embeddingText,
      );
    } catch (error) {
      this.logger.error('Embedding generation failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }

    // 10. Persist book with embedding atomically
    const savedBook = await this.bookRepository.save({
      book,
      embedding: embeddingResult.embedding,
    });

    this.logger.info('Book created successfully', {
      bookId: savedBook.id,
      title: savedBook.title,
      authors: savedBook.authors.map(a => a.name),
      levelId: savedBook.levelId,
    });

    // 11. Return output DTO
    return this.toOutput(savedBook, levelName);
  }

  /**
   * Resolves a level by name, creating it if necessary and associating with the type.
   *
   * HU-008: Levels are validated against the book's type:
   * - If level exists and is associated with the type: use it
   * - If level exists but NOT associated with the type: throw LevelTypeMismatchError
   * - If level doesn't exist: create it and associate with the type
   *
   * @param levelName - The level name to resolve
   * @param typeId - The book type's UUID
   * @param typeName - The book type's name (for error messages)
   * @returns The resolved Level entity
   * @throws LevelTypeMismatchError if level exists but is not valid for this type
   */
  private async resolveLevel(
    levelName: string,
    typeId: string,
    typeName: string,
  ): Promise<Level> {
    const existingLevel = await this.levelRepository.findByName(levelName);

    if (existingLevel) {
      // Level exists - validate it's associated with this type
      const isValidForType = await this.levelRepository.existsForType(existingLevel.id, typeId);

      if (!isValidForType) {
        this.logger.warn('Level not valid for type', {
          levelName,
          levelId: existingLevel.id,
          typeName,
          typeId,
        });
        throw new LevelTypeMismatchError(levelName, typeName);
      }

      return existingLevel;
    }

    // Level doesn't exist - create it and associate with the type
    const newLevel = Level.create({
      id: generateUUID(),
      name: levelName,
    });

    await this.levelRepository.save(newLevel);
    await this.levelRepository.addToType(newLevel.id, typeId);

    this.logger.debug('Created new level and associated with type', {
      levelId: newLevel.id,
      levelName: newLevel.name,
      typeId,
    });

    return newLevel;
  }

  /**
   * Converts a Book entity to the output DTO
   *
   * HU-008: levelName is passed separately since the Book only stores levelId.
   * This avoids an extra repository lookup to get the level name.
   */
  private toOutput(book: Book, levelName: string | null): CreateBookOutput {
    return {
      id: book.id,
      title: book.title,
      authors: book.authors.map((a) => ({ id: a.id, name: a.name })),
      originalDescription: book.originalDescription, // HU-013
      description: book.description, // HU-013: Spanish description
      language: book.language, // HU-013
      type: book.type.name, // BookType entity has .name property
      categories: book.categories.map((c) => ({ id: c.id, name: c.name })),
      format: book.format.value,
      isbn: book.isbn?.value ?? null,
      level: levelName, // HU-008: Return level name, not ID
      available: book.available,
      path: book.path,
      createdAt: book.createdAt,
      updatedAt: book.updatedAt,
    };
  }
}
