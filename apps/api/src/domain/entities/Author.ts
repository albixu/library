/**
 * Author Entity
 *
 * Represents an author that can be associated with books.
 * Authors are reusable and managed independently with N:M relationship to Books.
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
} from '../errors/DomainErrors.js';
import { validateId } from '../validators/index.js';

/**
 * Field length constraints
 */
const FIELD_CONSTRAINTS = {
  NAME_MAX_LENGTH: 300,
} as const;

/**
 * Props required to create a new Author
 */
export interface CreateAuthorProps {
  id: string;
  name: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Props for reconstructing an Author from persistence
 */
export interface AuthorPersistenceProps {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Props that can be updated on an Author
 */
export interface UpdateAuthorProps {
  name?: string;
}

/**
 * Author Entity
 */
export class Author {
  private constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {
    Object.freeze(this);
  }

  /**
   * Creates a new Author instance with full validation
   * Use this when creating an author from user input
   */
  static create(props: CreateAuthorProps): Author {
    const id = validateId(props.id);
    const name = Author.validateName(props.name);

    const now = new Date();
    const createdAt = props.createdAt ?? now;
    const updatedAt = props.updatedAt ?? now;

    return new Author(id, name, createdAt, updatedAt);
  }

  /**
   * Reconstructs an Author from persistence without validation
   * Use this when loading an author from the database
   */
  static fromPersistence(props: AuthorPersistenceProps): Author {
    return new Author(
      props.id,
      props.name,
      props.createdAt,
      props.updatedAt,
    );
  }

  /**
   * Updates the author with new values, returning a new instance
   */
  update(props: UpdateAuthorProps): Author {
    const name = props.name !== undefined
      ? Author.validateName(props.name)
      : this.name;

    return new Author(
      this.id,
      name,
      this.createdAt,
      new Date(), // Update timestamp
    );
  }

  /**
   * Compares two Author instances by ID
   */
  equals(other: Author): boolean {
    return this.id === other.id;
  }

  // ==================== Private Validators ====================

  private static validateName(name: string): string {
    if (!name || name.trim().length === 0) {
      throw new RequiredFieldError('name');
    }

    const trimmedName = name.trim();

    if (trimmedName.length > FIELD_CONSTRAINTS.NAME_MAX_LENGTH) {
      throw new FieldTooLongError('name', FIELD_CONSTRAINTS.NAME_MAX_LENGTH);
    }

    return trimmedName;
  }
}
