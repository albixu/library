/**
 * Value Objects barrel export
 */

export { BookFormat, BOOK_FORMATS, type BookFormatValue, InvalidBookFormatError } from './BookFormat.js';
export { ISBN, InvalidISBNError } from './ISBN.js';

// Re-export InvalidBookTypeError from errors for backward compatibility
export { InvalidBookTypeError } from '../errors/DomainErrors.js';
