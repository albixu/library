/**
 * BookRepository Port (Driven/Output Port)
 *
 * Defines the contract for book persistence operations.
 * This is a port in the hexagonal architecture - the actual implementation
 * (e.g., PostgresBookRepository) will be an adapter in the infrastructure layer.
 *
 * Note: The embedding vector is handled at the persistence layer and is NOT
 * exposed to the domain. The repository receives it as a separate parameter
 * during save operations.
 */

import type { Book } from '../../domain/entities/Book.js';

/**
 * Parameters for saving a book with its embedding
 */
export interface SaveBookParams {
  /** The book entity to persist */
  book: Book;
  /** The embedding vector (dimensions are model-dependent) */
  embedding: number[];
}

/**
 * Parameters for updating a book's mutable fields
 *
 * Only includes the book ID and the fields that can be mutated after creation.
 * This prevents accidental persistence of changes to immutable fields.
 *
 * For optional fields:
 * - Omitting the field (undefined) means "don't change this field"
 * - Setting to null means "explicitly clear this field"
 * - Setting to a value means "update to this value"
 */
export interface UpdateBookParams {
  /** The book UUID to update */
  id: string;
  /**
   * Whether the book is currently available. Omit to keep current value.
   *
   * Implementations must check for the presence of this property on the
   * params object (e.g., `'available' in params`) rather than relying on
   * its truthiness, otherwise `available: false` would be treated as
   * "not provided".
   */
  available?: boolean;
  /** File path to the book. Omit to keep current value, set to null to clear. */
  path?: string | null;
}

/**
 * Result of a duplicate check operation
 *
 * With the multi-author model, duplicate detection is now ISBN-only.
 * The triad (author+title+format) detection was removed because:
 * - With N:M author relationships, comparing "same authors" is complex and ambiguous
 * - ISBN is the canonical unique identifier for published books
 * - Books without ISBN are considered unique (user responsibility)
 */
export interface DuplicateCheckResult {
  /** Whether a duplicate was found */
  isDuplicate: boolean;
  /** The type of duplicate found (currently only 'isbn') */
  duplicateType?: 'isbn';
  /** Human-readable message describing the duplicate */
  message?: string;
}

/**
 * BookRepository Port Interface
 *
 * Provides operations for managing books in the persistence layer.
 * Handles duplicate detection and embedding storage.
 */
export interface BookRepository {
  /**
   * Finds a book by its unique identifier
   *
   * @param id - The book UUID
   * @returns Promise resolving to the Book if found, null otherwise
   */
  findById(id: string): Promise<Book | null>;

  /**
   * Finds a book by its ISBN
   *
   * @param isbn - The ISBN to search for (normalized, without hyphens)
   * @returns Promise resolving to the Book if found, null otherwise
   */
  findByIsbn(isbn: string): Promise<Book | null>;

  /**
   * Checks if a book with the given ISBN already exists
   *
   * @param isbn - The ISBN to check (normalized, without hyphens)
   * @returns Promise resolving to true if ISBN exists, false otherwise
   */
  existsByIsbn(isbn: string): Promise<boolean>;

  /**
   * Performs duplicate check for ISBN
   *
   * With the multi-author model, duplicate detection is ISBN-only.
   * Use this before creating a book to get detailed duplicate information.
   *
   * @param params - Object containing isbn (optional, already-normalized string, typically ISBN.value)
   * @returns Promise resolving to duplicate check result
   *
   * @remarks The application layer must pass the ISBN as an already-normalized
   * string produced by the ISBN value object (without hyphens, uppercase).
   * If isbn is null/undefined, no duplicate check is performed and isDuplicate will be false.
   */
  checkDuplicate(params: { isbn?: string | null }): Promise<DuplicateCheckResult>;

  /**
   * Saves a new book with its embedding vector
   *
   * This is an atomic operation that persists both the book data
   * and its vector embedding in a single transaction.
   *
   * @param params - The book and embedding to save
   * @returns Promise resolving to the saved Book
   * @throws DuplicateISBNError if a book with the same ISBN already exists
   * @throws DuplicateBookError if a book with the same author, title, and format already exists
   */
  save(params: SaveBookParams): Promise<Book>;

  /**
   * Updates an existing book's mutable fields (available, path)
   *
   * Only the fields explicitly provided in params will be updated.
   * All other fields (title, author, description, type, categories, format)
   * are immutable after creation because they affect the embedding.
   *
   * @param params - Update parameters containing the book ID and fields to update
   * @returns Promise resolving to the updated Book
   * @throws BookNotFoundError if the book doesn't exist
   */
  update(params: UpdateBookParams): Promise<Book>;

  /**
   * Deletes a book by its ID
   *
   * @param id - The book UUID to delete
   * @returns Promise resolving to true if deleted, false if not found
   */
  delete(id: string): Promise<boolean>;

  /**
   * Retrieves all books (without embeddings)
   *
   * @returns Promise resolving to an array of all Books
   */
  findAll(): Promise<Book[]>;

  /**
   * Counts the total number of books
   *
   * @returns Promise resolving to the total count
   */
  count(): Promise<number>;
}
