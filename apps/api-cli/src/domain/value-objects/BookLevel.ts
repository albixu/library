/**
 * BookLevel Value Object
 *
 * Represents the difficulty level of a technical book.
 *
 * Value Objects are:
 * - Immutable
 * - Compared by value, not identity
 * - Self-validating
 *
 * NOTE: BookLevel is CASE-SENSITIVE. Values must match exactly
 * (e.g., "Beginner", not "beginner" or "BEGINNER").
 */

export const BOOK_LEVELS = [
  'Beginner',
  'Intermediate',
  'Advanced',
  'Beginner to Intermediate',
  'Intermediate to Advanced',
] as const;

export type BookLevelValue = (typeof BOOK_LEVELS)[number];

export class BookLevel {
  private constructor(public readonly value: BookLevelValue) {
    Object.freeze(this);
  }

  /**
   * Creates a new BookLevel instance
   * @throws InvalidBookLevelError if the value is not valid (case-sensitive)
   */
  static create(value: string): BookLevel {
    if (!BookLevel.isValid(value)) {
      throw new InvalidBookLevelError(value);
    }

    return new BookLevel(value as BookLevelValue);
  }

  /**
   * Creates a BookLevel from a known valid value (no validation)
   * Use only when the value comes from a trusted source (e.g., database)
   */
  static fromPersistence(value: BookLevelValue): BookLevel {
    return new BookLevel(value);
  }

  /**
   * Checks if a value is a valid BookLevel (case-sensitive)
   */
  static isValid(value: string): value is BookLevelValue {
    return BOOK_LEVELS.includes(value as BookLevelValue);
  }

  /**
   * Returns all valid book levels
   */
  static getAllLevels(): readonly BookLevelValue[] {
    return BOOK_LEVELS;
  }

  /**
   * Compares two BookLevel instances
   */
  equals(other: BookLevel): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

/**
 * Error thrown when an invalid book level is provided
 */
export class InvalidBookLevelError extends Error {
  constructor(value: string) {
    super(
      `Invalid book level: "${value}". Valid levels are: ${BOOK_LEVELS.join(', ')}`
    );
    this.name = 'InvalidBookLevelError';
  }
}
