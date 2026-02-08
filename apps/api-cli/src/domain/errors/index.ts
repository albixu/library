/**
 * Domain Errors barrel export
 */

export {
  DomainError,
  BookNotFoundError,
  BookAlreadyExistsError,
  CategoryNotFoundError,
  CategoryAlreadyExistsError,
  RequiredFieldError,
  FieldTooLongError,
  InvalidUUIDError,
  TooManyItemsError,
  DuplicateItemError,
} from './DomainErrors.js';

// Re-export Value Object errors for convenience
export { InvalidBookTypeError } from '../value-objects/BookType.js';
export { InvalidBookFormatError } from '../value-objects/BookFormat.js';
export { InvalidISBNError } from '../value-objects/ISBN.js';
