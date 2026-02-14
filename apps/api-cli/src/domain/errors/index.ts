/**
 * Domain Errors barrel export
 */

export {
  DomainError,
  BookNotFoundError,
  BookAlreadyExistsError,
  DuplicateISBNError,
  DuplicateBookError,
  CategoryNotFoundError,
  CategoryAlreadyExistsError,
  RequiredFieldError,
  FieldTooLongError,
  InvalidUUIDError,
  TooManyItemsError,
  DuplicateItemError,
  InvalidBookTypeError,
} from './DomainErrors.js';

// Re-export Value Object errors for convenience
export { InvalidBookFormatError } from '../value-objects/BookFormat.js';
export { InvalidISBNError } from '../value-objects/ISBN.js';
