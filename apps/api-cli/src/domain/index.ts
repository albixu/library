/**
 * Domain module barrel export
 *
 * This is the public API of the domain layer.
 * Only export what should be accessible from outside the domain.
 */

// Entities
export {
  Book,
  type CreateBookProps,
  type BookPersistenceProps,
  type UpdateBookProps,
} from './entities/index.js';

// Value Objects
export {
  BookType,
  BOOK_TYPES,
  type BookTypeValue,
  BookFormat,
  BOOK_FORMATS,
  type BookFormatValue,
  ISBN,
} from './value-objects/index.js';

// Errors
export {
  DomainError,
  BookNotFoundError,
  BookAlreadyExistsError,
  RequiredFieldError,
  FieldTooLongError,
  InvalidUUIDError,
  InvalidBookTypeError,
  InvalidBookFormatError,
  InvalidISBNError,
} from './errors/index.js';
