/**
 * Value Objects barrel export
 */

export { BookFormat, BOOK_FORMATS, type BookFormatValue, InvalidBookFormatError } from './BookFormat.js';
export { BookIdentifier, InvalidBookIdentifierError } from './BookIdentifier.js';
// ISBN re-exported for backward compatibility
export { ISBN, InvalidISBNError } from './ISBN.js';

// Re-export InvalidBookTypeError from errors for backward compatibility
export { InvalidBookTypeError } from '../errors/DomainErrors.js';
