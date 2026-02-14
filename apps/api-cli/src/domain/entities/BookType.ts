/**
 * BookType Entity
 *
 * Represents the type/genre classification of a book.
 * This is a high-level categorization (technical, novel, biography, etc.)
 *
 * BookType was converted from a Value Object to an Entity to support:
 * - Persistence in database with unique ID
 * - N:1 relationship with Books
 * - Future extensibility (adding new types without code changes)
 *
 * Entities are:
 * - Identified by a unique ID (not by their attributes)
 * - Mutable through controlled methods
 * - Responsible for maintaining their own invariants
 *
 * This entity follows an immutable pattern - all "mutations" return new instances.
 */

import {
  RequiredFieldError,
  FieldTooLongError,
  InvalidUUIDError,
} from '../errors/DomainErrors.js';

/**
 * Field length constraints
 */
const FIELD_CONSTRAINTS = {
  NAME_MAX_LENGTH: 50,
} as const;

/**
 * UUID v4 regex pattern
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Default book types that should be seeded in the database
 */
export const DEFAULT_BOOK_TYPES = ['technical', 'novel', 'biography'] as const;

export type DefaultBookTypeName = (typeof DEFAULT_BOOK_TYPES)[number];

/**
 * Props required to create a new BookType
 */
export interface CreateBookTypeProps {
  id: string;
  name: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Props for reconstructing a BookType from persistence
 */
export interface BookTypePersistenceProps {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Props that can be updated on a BookType
 */
export interface UpdateBookTypeProps {
  name?: string;
}

/**
 * BookType Entity
 */
export class BookType {
  private constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {
    Object.freeze(this);
  }

  /**
   * Creates a new BookType instance with full validation
   * Use this when creating a book type from user input
   */
  static create(props: CreateBookTypeProps): BookType {
    const id = BookType.validateId(props.id);
    const name = BookType.validateName(props.name);

    const now = new Date();
    const createdAt = props.createdAt ?? now;
    const updatedAt = props.updatedAt ?? now;

    return new BookType(id, name, createdAt, updatedAt);
  }

  /**
   * Reconstructs a BookType from persistence without validation
   * Use this when loading a book type from the database
   */
  static fromPersistence(props: BookTypePersistenceProps): BookType {
    return new BookType(
      props.id,
      props.name,
      props.createdAt,
      props.updatedAt
    );
  }

  /**
   * Updates the book type with new values, returning a new instance
   */
  update(props: UpdateBookTypeProps): BookType {
    const name = props.name !== undefined
      ? BookType.validateName(props.name)
      : this.name;

    return new BookType(
      this.id,
      name,
      this.createdAt,
      new Date() // Update timestamp
    );
  }

  /**
   * Compares two BookType instances by ID (Entity comparison)
   */
  equals(other: BookType): boolean {
    return this.id === other.id;
  }

  /**
   * Checks if the book type has the given name
   */
  hasName(name: string): boolean {
    return this.name.toLowerCase() === name.toLowerCase();
  }

  /**
   * Returns string representation
   */
  toString(): string {
    return this.name;
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

  private static validateName(name: string): string {
    if (!name || name.trim().length === 0) {
      throw new RequiredFieldError('name');
    }

    const trimmedName = name.trim().toLowerCase();

    if (trimmedName.length > FIELD_CONSTRAINTS.NAME_MAX_LENGTH) {
      throw new FieldTooLongError('name', FIELD_CONSTRAINTS.NAME_MAX_LENGTH);
    }

    return trimmedName;
  }
}
