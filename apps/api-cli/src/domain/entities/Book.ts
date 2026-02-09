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
 */

import { BookType, type BookTypeValue } from '../value-objects/BookType.js';
import { BookFormat, type BookFormatValue } from '../value-objects/BookFormat.js';
import { ISBN } from '../value-objects/ISBN.js';
import { Category } from './Category.js';
import {
  RequiredFieldError,
  FieldTooLongError,
  InvalidUUIDError,
  TooManyItemsError,
  DuplicateItemError,
} from '../errors/DomainErrors.js';

/**
 * Field length constraints
 */
const FIELD_CONSTRAINTS = {
  TITLE_MAX_LENGTH: 500,
  AUTHOR_MAX_LENGTH: 300,
  DESCRIPTION_MAX_LENGTH: 5000,
  MAX_CATEGORIES: 10,
  PATH_MAX_LENGTH: 1000,
} as const;

/**
 * UUID v4 regex pattern
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Props required to create a new Book
 */
export interface CreateBookProps {
  id: string;
  title: string;
  author: string;
  type: string;
  categories: Category[];
  format: string;
  description: string;
  isbn?: string | null;
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
 */
export interface BookPersistenceProps {
  id: string;
  title: string;
  author: string;
  type: BookTypeValue;
  categories: Category[];
  format: BookFormatValue;
  isbn: string | null;
  description: string;
  available: boolean;
  path: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Props that can be updated on a Book
 */
export interface UpdateBookProps {
  title?: string;
  author?: string;
  type?: string;
  categories?: Category[];
  format?: string;
  isbn?: string | null;
  description?: string;
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
    public readonly author: string,
    public readonly type: BookType,
    public readonly categories: readonly Category[],
    public readonly format: BookFormat,
    public readonly isbn: ISBN | null,
    public readonly description: string,
    public readonly available: boolean,
    public readonly path: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {
    Object.freeze(this);
  }

  /**
   * Creates a new Book instance with full validation
   * Use this when creating a book from user input
   */
  static create(props: CreateBookProps): Book {
    // Validate required fields
    const id = Book.validateId(props.id);
    const title = Book.validateTitle(props.title);
    const author = Book.validateAuthor(props.author);
    const categories = Book.validateCategories(props.categories);
    const description = Book.validateDescription(props.description);

    // Validate and create value objects
    const type = BookType.create(props.type);
    const format = BookFormat.create(props.format);

    // Validate optional fields
    const isbn = props.isbn ? ISBN.create(props.isbn) : null;

    // Available defaults to false, path is optional
    const available = props.available ?? false;
    const path = props.path ? Book.validatePath(props.path) : null;

    const now = new Date();
    const createdAt = props.createdAt ?? now;
    const updatedAt = props.updatedAt ?? now;

    return new Book(
      id,
      title,
      author,
      type,
      categories,
      format,
      isbn,
      description,
      available,
      path,
      createdAt,
      updatedAt
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
      props.author,
      BookType.fromPersistence(props.type),
      Object.freeze([...props.categories]),
      BookFormat.fromPersistence(props.format),
      props.isbn ? ISBN.fromPersistence(props.isbn) : null,
      props.description,
      props.available,
      props.path,
      props.createdAt,
      props.updatedAt
    );
  }

  /**
   * Updates the book with new values, returning a new instance
   */
  update(props: UpdateBookProps): Book {
    const title = props.title !== undefined
      ? Book.validateTitle(props.title)
      : this.title;

    const author = props.author !== undefined
      ? Book.validateAuthor(props.author)
      : this.author;

    const type = props.type !== undefined
      ? BookType.create(props.type)
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

    const description = props.description !== undefined
      ? Book.validateDescription(props.description)
      : this.description;

    const available = props.available !== undefined
      ? props.available
      : this.available;

    const path = props.path !== undefined
      ? (props.path ? Book.validatePath(props.path) : null)
      : this.path;

    return new Book(
      this.id,
      title,
      author,
      type,
      categories,
      format,
      isbn,
      description,
      available,
      path,
      this.createdAt,
      new Date() // Update timestamp
    );
  }

  /**
   * Gets the text that should be used to generate embeddings
   *
   * This provides a consistent text representation for the infrastructure
   * layer to use when generating vector embeddings for semantic search.
   */
  getTextForEmbedding(): string {
    const categoryNames = this.categories.map(c => c.name);
    const parts = [
      this.title,
      this.author,
      this.type.value,
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

  private static validateId(id: string): string {
    if (!id || id.trim().length === 0) {
      throw new RequiredFieldError('id');
    }

    const trimmedId = id.trim();

    if (!UUID_REGEX.test(trimmedId)) {
      throw new InvalidUUIDError(id);
    }

    return trimmedId;
  }

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

  private static validateAuthor(author: string): string {
    if (!author || author.trim().length === 0) {
      throw new RequiredFieldError('author');
    }

    const trimmedAuthor = author.trim();

    if (trimmedAuthor.length > FIELD_CONSTRAINTS.AUTHOR_MAX_LENGTH) {
      throw new FieldTooLongError('author', FIELD_CONSTRAINTS.AUTHOR_MAX_LENGTH);
    }

    return trimmedAuthor;
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

  private static validateDescription(description: string): string {
    if (!description || description.trim().length === 0) {
      throw new RequiredFieldError('description');
    }

    const trimmedDescription = description.trim();

    if (trimmedDescription.length > FIELD_CONSTRAINTS.DESCRIPTION_MAX_LENGTH) {
      throw new FieldTooLongError('description', FIELD_CONSTRAINTS.DESCRIPTION_MAX_LENGTH);
    }

    return trimmedDescription;
  }

  private static validatePath(path: string): string {
    const trimmedPath = path.trim();

    if (trimmedPath.length > FIELD_CONSTRAINTS.PATH_MAX_LENGTH) {
      throw new FieldTooLongError('path', FIELD_CONSTRAINTS.PATH_MAX_LENGTH);
    }

    return trimmedPath;
  }
}
