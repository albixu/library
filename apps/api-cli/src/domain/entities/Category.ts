/**
 * Category Entity
 *
 * Represents a category that can be assigned to books.
 * Categories are reusable and managed independently.
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
  NAME_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 500,
} as const;

/**
 * Props required to create a new Category
 */
export interface CreateCategoryProps {
  id: string;
  name: string;
  description?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Props for reconstructing a Category from persistence
 */
export interface CategoryPersistenceProps {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Props that can be updated on a Category
 */
export interface UpdateCategoryProps {
  name?: string;
  description?: string | null;
}

/**
 * Category Entity
 */
export class Category {
  private constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {
    Object.freeze(this);
  }

  /**
   * Creates a new Category instance with full validation
   * Use this when creating a category from user input
   */
  static create(props: CreateCategoryProps): Category {
    const id = validateId(props.id);
    const name = Category.validateName(props.name);
    const description = props.description
      ? Category.validateDescription(props.description)
      : null;

    const now = new Date();
    const createdAt = props.createdAt ?? now;
    const updatedAt = props.updatedAt ?? now;

    return new Category(id, name, description, createdAt, updatedAt);
  }

  /**
   * Reconstructs a Category from persistence without validation
   * Use this when loading a category from the database
   */
  static fromPersistence(props: CategoryPersistenceProps): Category {
    return new Category(
      props.id,
      props.name,
      props.description,
      props.createdAt,
      props.updatedAt
    );
  }

  /**
   * Updates the category with new values, returning a new instance
   */
  update(props: UpdateCategoryProps): Category {
    const name = props.name !== undefined
      ? Category.validateName(props.name)
      : this.name;

    const description = props.description !== undefined
      ? (props.description ? Category.validateDescription(props.description) : null)
      : this.description;

    return new Category(
      this.id,
      name,
      description,
      this.createdAt,
      new Date() // Update timestamp
    );
  }

  /**
   * Compares two Category instances by ID
   */
  equals(other: Category): boolean {
    return this.id === other.id;
  }

  // ==================== Private Validators ====================

  private static validateName(name: string): string {
    if (!name || name.trim().length === 0) {
      throw new RequiredFieldError('name');
    }

    const normalizedName = name.trim().toLowerCase();

    if (normalizedName.length > FIELD_CONSTRAINTS.NAME_MAX_LENGTH) {
      throw new FieldTooLongError('name', FIELD_CONSTRAINTS.NAME_MAX_LENGTH);
    }

    return normalizedName;
  }

  private static validateDescription(description: string): string {
    const trimmedDescription = description.trim();

    if (trimmedDescription.length > FIELD_CONSTRAINTS.DESCRIPTION_MAX_LENGTH) {
      throw new FieldTooLongError('description', FIELD_CONSTRAINTS.DESCRIPTION_MAX_LENGTH);
    }

    return trimmedDescription;
  }
}
