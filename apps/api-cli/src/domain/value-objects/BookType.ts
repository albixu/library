/**
 * BookType Value Object
 *
 * Represents the type/genre classification of a book.
 * This is a high-level categorization (technical, novel, essay, etc.)
 *
 * Value Objects are:
 * - Immutable
 * - Compared by value, not identity
 * - Self-validating
 */

export const BOOK_TYPES = [
  'technical',
  'novel',
  'essay',
  'poetry',
  'biography',
  'reference',
  'manual',
  'other',
] as const;

export type BookTypeValue = (typeof BOOK_TYPES)[number];

export class BookType {
  private constructor(public readonly value: BookTypeValue) {
    Object.freeze(this);
  }

  /**
   * Creates a new BookType instance
   * @throws InvalidBookTypeError if the value is not valid
   */
  static create(value: string): BookType {
    const normalizedValue = value.toLowerCase().trim();

    if (!BookType.isValid(normalizedValue)) {
      throw new InvalidBookTypeError(value);
    }

    return new BookType(normalizedValue as BookTypeValue);
  }

  /**
   * Creates a BookType from a known valid value (no validation)
   * Use only when the value comes from a trusted source (e.g., database)
   */
  static fromPersistence(value: BookTypeValue): BookType {
    return new BookType(value);
  }

  /**
   * Checks if a value is a valid BookType
   */
  static isValid(value: string): value is BookTypeValue {
    return BOOK_TYPES.includes(value as BookTypeValue);
  }

  /**
   * Returns all valid book types
   */
  static getAllTypes(): readonly BookTypeValue[] {
    return BOOK_TYPES;
  }

  /**
   * Compares two BookType instances
   */
  equals(other: BookType): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

/**
 * Error thrown when an invalid book type is provided
 */
export class InvalidBookTypeError extends Error {
  constructor(value: string) {
    super(
      `Invalid book type: "${value}". Valid types are: ${BOOK_TYPES.join(', ')}`
    );
    this.name = 'InvalidBookTypeError';
  }
}
