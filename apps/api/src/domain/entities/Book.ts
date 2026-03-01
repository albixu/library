/**
 * Book Entity
 *
 * The core domain entity representing a book in the digital library.
 *
 * Entities are:
 * - Identified by a unique ID (not by their attributes)
 * - Mutable through controlled methods
 * - Responsible for maintaining their own invariants
 *
 * This entity follows an immutable pattern - all "mutations" return new instances.
 *
 * Note: Embeddings are NOT part of the domain model. They are an infrastructure
 * concern for semantic search, managed exclusively at the persistence layer.
 *
 * HU-008: The level field is now a UUID reference to the Level entity (or null).
 * Level validation against the type's allowed levels is done at the use case layer.
 *
 * HU-013: Added originalDescription and language fields for translation support.
 * - originalDescription: stores the description in the original language
 * - description: always contains Spanish text (translated if needed)
 * - language: ISO 639-1 code of the original language
 */

import { BookFormat, type BookFormatValue } from '../value-objects/BookFormat.js';
import { ISBN } from '../value-objects/ISBN.js';
import type { Author } from './Author.js';
import type { BookType } from './BookType.js';
import type { Category } from './Category.js';
import {
  RequiredFieldError,
  FieldTooLongError,
  TooManyItemsError,
  DuplicateItemError,
  InvalidLanguageCodeError,
} from '../errors/DomainErrors.js';
import { validateId, isValidUUID } from '../validators/index.js';

/**
 * Field length constraints
 */
const FIELD_CONSTRAINTS = {
  TITLE_MAX_LENGTH: 500,
  DESCRIPTION_MAX_LENGTH: 5000,
  MAX_CATEGORIES: 10,
  MAX_AUTHORS: 10,
  PATH_MAX_LENGTH: 1000,
  LANGUAGE_MAX_LENGTH: 10,
} as const;

/**
 * ISO 639-1 language code pattern (2 lowercase letters)
 */
const ISO_639_1_REGEX = /^[a-z]{2}$/;

/**
 * Props required to create a new Book
 * 
 * HU-013: description is the input text (in any language).
 * It will be stored in originalDescription, and description
 * will contain the Spanish translation (or same if already Spanish).
 * language is required to determine if translation is needed.
 * translatedDescription is provided by the use case layer after translation.
 */
export interface CreateBookProps {
  id: string;
  title: string;
  authors: Author[];
  type: BookType;
  categories: Category[];
  format: string;
  description: string; // Input description (any language) -> stored as originalDescription
  language: string; // ISO 639-1 code (required)
  translatedDescription?: string; // HU-013: Spanish description (provided by use case after translation)
  isbn?: string | null;
  levelId?: string | null; // HU-008: UUID reference to Level entity
  available?: boolean;
  path?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Props for reconstructing a Book from persistence
 *
 * Note: Embedding is intentionally excluded - it's managed at the persistence
 * layer and never exposed to the domain.
 *
 * HU-013: Added originalDescription and language fields.
 */
export interface BookPersistenceProps {
  id: string;
  title: string;
  authors: Author[];
  type: BookType;
  categories: Category[];
  format: BookFormatValue;
  isbn: string | null;
  levelId: string | null; // HU-008: UUID reference to Level entity
  originalDescription: string; // HU-013: Original language description
  description: string; // HU-013: Spanish description
  language: string; // HU-013: ISO 639-1 code
  available: boolean;
  path: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Props that can be updated on a Book
 * 
 * HU-013: description is NOT editable after creation because it affects
 * embeddings and is tied to the original translation.
 */
export interface UpdateBookProps {
  title?: string;
  authors?: Author[];
  type?: BookType;
  categories?: Category[];
  format?: string;
  isbn?: string | null;
  available?: boolean;
  path?: string | null;
}

/**
 * Book Entity
 */
export class Book {
  private constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly authors: readonly Author[],
    public readonly type: BookType,
    public readonly categories: readonly Category[],
    public readonly format: BookFormat,
    public readonly isbn: ISBN | null,
    public readonly levelId: string | null, // HU-008: UUID reference to Level entity
    public readonly originalDescription: string, // HU-013: Original language description
    public readonly description: string, // HU-013: Spanish description
    public readonly language: string, // HU-013: ISO 639-1 code
    public readonly available: boolean,
    public readonly path: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {
    Object.freeze(this);
  }

  /**
   * Creates a new Book instance with full validation
   * Use this when creating a book from user input
   * 
   * HU-013: The description input is stored as originalDescription.
   * The description field will be set by the use case layer after translation.
   * For now, create() sets description = originalDescription (caller handles translation).
   */
  static create(props: CreateBookProps): Book {
    // Validate required fields
    const id = validateId(props.id);
    const title = Book.validateTitle(props.title);
    const authors = Book.validateAuthors(props.authors);
    const categories = Book.validateCategories(props.categories);
    const originalDescription = Book.validateDescription(props.description, 'description');
    const language = Book.validateLanguage(props.language);

    // Validate type (must be a valid BookType entity)
    const type = Book.validateType(props.type);

    // Validate and create value objects
    const format = BookFormat.create(props.format);

    // Validate optional fields
    const isbn = props.isbn ? ISBN.create(props.isbn) : null;
    
    // HU-008: Validate levelId as UUID if provided
    const levelId = props.levelId ? Book.validateLevelId(props.levelId) : null;

    // Available defaults to true (new books are available by default), path is optional
    const available = props.available ?? true;
    const path = props.path ? Book.validatePath(props.path) : null;

    const now = new Date();
    const createdAt = props.createdAt ?? now;
    const updatedAt = props.updatedAt ?? now;

    // HU-013: Use translatedDescription if provided, otherwise use originalDescription
    // The use case layer is responsible for providing the translation
    const description = props.translatedDescription 
      ? Book.validateDescription(props.translatedDescription, 'translatedDescription')
      : originalDescription;

    return new Book(
      id,
      title,
      authors,
      type,
      categories,
      format,
      isbn,
      levelId,
      originalDescription,
      description,
      language,
      available,
      path,
      createdAt,
      updatedAt,
    );
  }

  /**
   * Reconstructs a Book from persistence without validation
   * Use this when loading a book from the database
   */
  static fromPersistence(props: BookPersistenceProps): Book {
    return new Book(
      props.id,
      props.title,
      Object.freeze([...props.authors]),
      props.type,
      Object.freeze([...props.categories]),
      BookFormat.fromPersistence(props.format),
      props.isbn ? ISBN.fromPersistence(props.isbn) : null,
      props.levelId, // HU-008: UUID is stored directly
      props.originalDescription, // HU-013
      props.description, // HU-013: Spanish description
      props.language, // HU-013
      props.available,
      props.path,
      props.createdAt,
      props.updatedAt,
    );
  }

  /**
   * Updates the book with new values, returning a new instance
   * Note: levelId, originalDescription, description, and language are NOT editable after creation
   * (these are semantic content that affects embeddings)
   */
  update(props: UpdateBookProps): Book {
    const title = props.title !== undefined
      ? Book.validateTitle(props.title)
      : this.title;

    const authors = props.authors !== undefined
      ? Book.validateAuthors(props.authors)
      : this.authors;

    const type = props.type !== undefined
      ? Book.validateType(props.type)
      : this.type;

    const categories = props.categories !== undefined
      ? Book.validateCategories(props.categories)
      : this.categories;

    const format = props.format !== undefined
      ? BookFormat.create(props.format)
      : this.format;

    const isbn = props.isbn !== undefined
      ? (props.isbn ? ISBN.create(props.isbn) : null)
      : this.isbn;

    const available = props.available !== undefined
      ? props.available
      : this.available;

    const path = props.path !== undefined
      ? (props.path ? Book.validatePath(props.path) : null)
      : this.path;

    return new Book(
      this.id,
      title,
      authors,
      type,
      categories,
      format,
      isbn,
      this.levelId, // levelId is NOT editable after creation
      this.originalDescription, // HU-013: NOT editable
      this.description, // HU-013: NOT editable (affects embeddings)
      this.language, // HU-013: NOT editable
      available,
      path,
      this.createdAt,
      new Date(), // Update timestamp
    );
  }

  /**
   * Gets the text that should be used to generate embeddings
   *
   * This provides a consistent text representation for the infrastructure
   * layer to use when generating vector embeddings for semantic search.
   */
  getTextForEmbedding(): string {
    const authorNames = this.authors.map(a => a.name);
    const categoryNames = this.categories.map(c => c.name);
    const parts = [
      this.title,
      ...authorNames,
      this.type.name,
      ...categoryNames,
      this.description,
    ];

    return parts.join(' ');
  }

  /**
   * Compares two Book instances by ID
   */
  equals(other: Book): boolean {
    return this.id === other.id;
  }

  // ==================== Private Validators ====================

  private static validateTitle(title: string): string {
    if (!title || title.trim().length === 0) {
      throw new RequiredFieldError('title');
    }

    const trimmedTitle = title.trim();

    if (trimmedTitle.length > FIELD_CONSTRAINTS.TITLE_MAX_LENGTH) {
      throw new FieldTooLongError('title', FIELD_CONSTRAINTS.TITLE_MAX_LENGTH);
    }

    return trimmedTitle;
  }

  private static validateAuthors(authors: Author[]): readonly Author[] {
    if (!authors || authors.length === 0) {
      throw new RequiredFieldError('authors');
    }

    if (authors.length > FIELD_CONSTRAINTS.MAX_AUTHORS) {
      throw new TooManyItemsError('authors', FIELD_CONSTRAINTS.MAX_AUTHORS);
    }

    const seen = new Set<string>();

    for (const author of authors) {
      if (seen.has(author.id)) {
        throw new DuplicateItemError('authors', author.name);
      }
      seen.add(author.id);
    }

    return Object.freeze([...authors]);
  }

  private static validateType(type: BookType): BookType {
    if (!type) {
      throw new RequiredFieldError('type');
    }

    return type;
  }

  private static validateCategories(categories: Category[]): readonly Category[] {
    if (!categories || categories.length === 0) {
      throw new RequiredFieldError('categories');
    }

    if (categories.length > FIELD_CONSTRAINTS.MAX_CATEGORIES) {
      throw new TooManyItemsError('categories', FIELD_CONSTRAINTS.MAX_CATEGORIES);
    }

    const seen = new Set<string>();

    for (const category of categories) {
      if (seen.has(category.id)) {
        throw new DuplicateItemError('categories', category.name);
      }
      seen.add(category.id);
    }

    return Object.freeze([...categories]);
  }

  private static validateDescription(description: string, fieldName = 'description'): string {
    if (!description || description.trim().length === 0) {
      throw new RequiredFieldError(fieldName);
    }

    const trimmedDescription = description.trim();

    if (trimmedDescription.length > FIELD_CONSTRAINTS.DESCRIPTION_MAX_LENGTH) {
      throw new FieldTooLongError(fieldName, FIELD_CONSTRAINTS.DESCRIPTION_MAX_LENGTH);
    }

    return trimmedDescription;
  }

  /**
   * HU-013: Validates language as a valid ISO 639-1 code (2 lowercase letters)
   */
  private static validateLanguage(language: string): string {
    if (!language || language.trim().length === 0) {
      throw new RequiredFieldError('language');
    }

    const trimmed = language.trim().toLowerCase();

    if (!ISO_639_1_REGEX.test(trimmed)) {
      throw new InvalidLanguageCodeError(language.trim());
    }

    return trimmed;
  }

  private static validatePath(path: string): string {
    const trimmedPath = path.trim();

    if (trimmedPath.length > FIELD_CONSTRAINTS.PATH_MAX_LENGTH) {
      throw new FieldTooLongError('path', FIELD_CONSTRAINTS.PATH_MAX_LENGTH);
    }

    return trimmedPath;
  }

  /**
   * HU-008: Validates levelId as a valid UUID v4
   */
  private static validateLevelId(levelId: string): string {
    const trimmed = levelId.trim();
    
    if (trimmed.length === 0) {
      throw new RequiredFieldError('levelId');
    }

    if (!isValidUUID(trimmed)) {
      throw new RequiredFieldError('levelId'); // Invalid UUID treated as invalid input
    }

    return trimmed;
  }
}
