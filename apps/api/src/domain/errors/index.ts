/**
 * Domain Errors barrel export
 */

export {
  DomainError,
  BookNotFoundError,
  DuplicateISBNError,
  DuplicateBookError,
  CategoryNotFoundError,
  CategoryAlreadyExistsError,
  AuthorAlreadyExistsError,
  RequiredFieldError,
  FieldTooLongError,
  InvalidUUIDError,
  TooManyItemsError,
  DuplicateItemError,
  InvalidBookTypeError,
  EmbeddingTextTooLongError,
  CategoryTypeMismatchError,
  LevelTypeMismatchError,
  InvalidLanguageCodeError,
  BookFileNotFoundError,
  EmailSendError,
} from './DomainErrors.js';

// Re-export Value Object errors for convenience
export { InvalidBookFormatError } from '../value-objects/BookFormat.js';
export { InvalidBookIdentifierError } from '../value-objects/BookIdentifier.js';
// InvalidISBNError re-exported for backward compatibility
export { InvalidISBNError } from '../value-objects/ISBN.js';
export { InvalidEmailAddressError } from '../value-objects/EmailAddress.js';
