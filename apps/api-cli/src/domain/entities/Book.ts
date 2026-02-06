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
 */

import { BookType, type BookTypeValue } from '../value-objects/BookType.js';
import { BookFormat, type BookFormatValue } from '../value-objects/BookFormat.js';
import { ISBN } from '../value-objects/ISBN.js';
import {
  RequiredFieldError,
  FieldTooLongError,
  InvalidUUIDError,
  InvalidEmbeddingError,
} from '../errors/DomainErrors.js';

/**
 * Expected embedding dimensions for nomic-embed-text model
 */
const EMBEDDING_DIMENSIONS = 768;

/**
 * Field length constraints
 */
const FIELD_CONSTRAINTS = {
  TITLE_MAX_LENGTH: 500,
  AUTHOR_MAX_LENGTH: 300,
  DESCRIPTION_MAX_LENGTH: 5000,
  CATEGORY_MAX_LENGTH: 100,
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
  category: string;
  format: string;
  isbn?: string | null;
  description?: string | null;
  embedding?: number[] | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Props for reconstructing a Book from persistence
 */
export interface BookPersistenceProps {
  id: string;
  title: string;
  author: string;
  type: BookTypeValue;
  category: string;
  format: BookFormatValue;
  isbn: string | null;
  description: string | null;
  embedding: number[] | null;
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
  category?: string;
  format?: string;
  isbn?: string | null;
  description?: string | null;
  embedding?: number[] | null;
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
    public readonly category: string,
    public readonly format: BookFormat,
    public readonly isbn: ISBN | null,
    public readonly description: string | null,
    public readonly embedding: readonly number[] | null,
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
    const category = Book.validateCategory(props.category);

    // Validate and create value objects
    const type = BookType.create(props.type);
    const format = BookFormat.create(props.format);

    // Validate optional fields
    const isbn = props.isbn ? ISBN.create(props.isbn) : null;
    const description = props.description
      ? Book.validateDescription(props.description)
      : null;
    const embedding = props.embedding
      ? Book.validateEmbedding(props.embedding)
      : null;

    const now = new Date();
    const createdAt = props.createdAt ?? now;
    const updatedAt = props.updatedAt ?? now;

    return new Book(
      id,
      title,
      author,
      type,
      category,
      format,
      isbn,
      description,
      embedding,
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
      props.category,
      BookFormat.fromPersistence(props.format),
      props.isbn ? ISBN.fromPersistence(props.isbn) : null,
      props.description,
      props.embedding ? Object.freeze([...props.embedding]) : null,
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

    const category = props.category !== undefined
      ? Book.validateCategory(props.category)
      : this.category;

    const format = props.format !== undefined
      ? BookFormat.create(props.format)
      : this.format;

    const isbn = props.isbn !== undefined
      ? (props.isbn ? ISBN.create(props.isbn) : null)
      : this.isbn;

    const description = props.description !== undefined
      ? (props.description ? Book.validateDescription(props.description) : null)
      : this.description;

    const embedding = props.embedding !== undefined
      ? (props.embedding ? Book.validateEmbedding(props.embedding) : null)
      : this.embedding;

    return new Book(
      this.id,
      title,
      author,
      type,
      category,
      format,
      isbn,
      description,
      embedding,
      this.createdAt,
      new Date() // Update timestamp
    );
  }

  /**
   * Updates only the embedding, returning a new instance
   */
  withEmbedding(embedding: number[]): Book {
    const validatedEmbedding = Book.validateEmbedding(embedding);

    return new Book(
      this.id,
      this.title,
      this.author,
      this.type,
      this.category,
      this.format,
      this.isbn,
      this.description,
      validatedEmbedding,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Checks if the book has an embedding
   */
  hasEmbedding(): boolean {
    return this.embedding !== null && this.embedding.length > 0;
  }

  /**
   * Gets the text that should be used to generate embeddings
   */
  getTextForEmbedding(): string {
    const parts = [this.title, this.author, this.category];

    if (this.description) {
      parts.push(this.description);
    }

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

  private static validateCategory(category: string): string {
    if (!category || category.trim().length === 0) {
      throw new RequiredFieldError('category');
    }

    const trimmedCategory = category.trim().toLowerCase();

    if (trimmedCategory.length > FIELD_CONSTRAINTS.CATEGORY_MAX_LENGTH) {
      throw new FieldTooLongError('category', FIELD_CONSTRAINTS.CATEGORY_MAX_LENGTH);
    }

    return trimmedCategory;
  }

  private static validateDescription(description: string): string {
    const trimmedDescription = description.trim();

    if (trimmedDescription.length > FIELD_CONSTRAINTS.DESCRIPTION_MAX_LENGTH) {
      throw new FieldTooLongError('description', FIELD_CONSTRAINTS.DESCRIPTION_MAX_LENGTH);
    }

    return trimmedDescription;
  }

  private static validateEmbedding(embedding: number[]): readonly number[] {
    if (!Array.isArray(embedding)) {
      throw new InvalidEmbeddingError('Embedding must be an array of numbers');
    }

    if (embedding.length !== EMBEDDING_DIMENSIONS) {
      throw new InvalidEmbeddingError(
        `Embedding must have ${EMBEDDING_DIMENSIONS} dimensions, got ${embedding.length}`
      );
    }

    if (!embedding.every((n) => typeof n === 'number' && !isNaN(n))) {
      throw new InvalidEmbeddingError('Embedding must contain only valid numbers');
    }

    return Object.freeze([...embedding]);
  }
}
