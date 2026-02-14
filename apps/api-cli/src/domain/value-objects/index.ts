/**
 * Value Objects barrel export
 */

/**
 * @deprecated BookType Value Object is being replaced by BookType Entity.
 * Import from 'domain/entities' for new code.
 */
export { BookType, BOOK_TYPES, type BookTypeValue } from './BookType.js';

export { BookFormat, BOOK_FORMATS, type BookFormatValue, InvalidBookFormatError } from './BookFormat.js';
export { ISBN, InvalidISBNError } from './ISBN.js';

// Re-export InvalidBookTypeError from errors for backward compatibility
export { InvalidBookTypeError } from '../errors/DomainErrors.js';
