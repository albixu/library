/**
 * Level Entity (HU-008)
 *
 * Represents a difficulty level that can be assigned to books.
 * Levels are dynamic and managed in the database with N:N relationship to Types.
 *
 * Replaces the previous BookLevel value object with a persistent entity.
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
} as const;

/**
 * Props required to create a new Level
 */
export interface CreateLevelProps {
  id: string;
  name: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Props for reconstructing a Level from persistence
 */
export interface LevelPersistenceProps {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Props that can be updated on a Level
 */
export interface UpdateLevelProps {
  name?: string;
}

/**
 * Level Entity
 */
export class Level {
  private constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {
    Object.freeze(this);
  }

  /**
   * Creates a new Level instance with full validation
   * Use this when creating a level from user input
   */
  static create(props: CreateLevelProps): Level {
    const id = validateId(props.id);
    const name = Level.validateName(props.name);

    const now = new Date();
    const createdAt = props.createdAt ?? now;
    const updatedAt = props.updatedAt ?? now;

    return new Level(id, name, createdAt, updatedAt);
  }

  /**
   * Reconstructs a Level from persistence without validation
   * Use this when loading a level from the database
   */
  static fromPersistence(props: LevelPersistenceProps): Level {
    return new Level(
      props.id,
      props.name,
      props.createdAt,
      props.updatedAt,
    );
  }

  /**
   * Updates the level with new values, returning a new instance
   */
  update(props: UpdateLevelProps): Level {
    const name = props.name !== undefined
      ? Level.validateName(props.name)
      : this.name;

    return new Level(
      this.id,
      name,
      this.createdAt,
      new Date(), // Update timestamp
    );
  }

  /**
   * Compares two Level instances by ID
   */
  equals(other: Level): boolean {
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
