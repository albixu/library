/**
 * BookFormat Value Object
 *
 * Represents the digital format of a book file.
 *
 * Value Objects are:
 * - Immutable
 * - Compared by value, not identity
 * - Self-validating
 */

export const BOOK_FORMATS = [
  'epub',
  'pdf',
  'mobi',
  'azw3',
  'djvu',
  'cbz',
  'cbr',
  'txt',
  'other',
] as const;

export type BookFormatValue = (typeof BOOK_FORMATS)[number];

export class BookFormat {
  private constructor(public readonly value: BookFormatValue) {
    Object.freeze(this);
  }

  /**
   * Creates a new BookFormat instance
   * @throws InvalidBookFormatError if the value is not valid
   */
  static create(value: string): BookFormat {
    const normalizedValue = value.toLowerCase().trim();

    if (!BookFormat.isValid(normalizedValue)) {
      throw new InvalidBookFormatError(value);
    }

    return new BookFormat(normalizedValue as BookFormatValue);
  }

  /**
   * Creates a BookFormat from a known valid value (no validation)
   * Use only when the value comes from a trusted source (e.g., database)
   */
  static fromPersistence(value: BookFormatValue): BookFormat {
    return new BookFormat(value);
  }

  /**
   * Checks if a value is a valid BookFormat
   */
  static isValid(value: string): value is BookFormatValue {
    return BOOK_FORMATS.includes(value as BookFormatValue);
  }

  /**
   * Returns all valid book formats
   */
  static getAllFormats(): readonly BookFormatValue[] {
    return BOOK_FORMATS;
  }

  /**
   * Compares two BookFormat instances
   */
  equals(other: BookFormat): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

/**
 * Error thrown when an invalid book format is provided
 */
export class InvalidBookFormatError extends Error {
  constructor(value: string) {
    super(
      `Invalid book format: "${value}". Valid formats are: ${BOOK_FORMATS.join(', ')}`
    );
    this.name = 'InvalidBookFormatError';
  }
}
