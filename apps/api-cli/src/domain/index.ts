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

export {
  Author,
  type CreateAuthorProps,
  type AuthorPersistenceProps,
  type UpdateAuthorProps,
} from './entities/index.js';

export {
  BookType as BookTypeEntity,
  DEFAULT_BOOK_TYPES,
  type DefaultBookTypeName,
  type CreateBookTypeProps,
  type BookTypePersistenceProps,
  type UpdateBookTypeProps,
} from './entities/index.js';

export {
  Category,
  type CreateCategoryProps,
  type CategoryPersistenceProps,
  type UpdateCategoryProps,
} from './entities/index.js';

// Value Objects
/**
 * @deprecated BookType VO is being replaced by BookTypeEntity.
 * Use BookTypeEntity from entities for new code.
 */
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
