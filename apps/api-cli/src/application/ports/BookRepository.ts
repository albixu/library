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
  /** The embedding vector (768 dimensions) */
  embedding: number[];
}

/**
 * Result of a duplicate check operation
 */
export interface DuplicateCheckResult {
  /** Whether a duplicate was found */
  isDuplicate: boolean;
  /** The type of duplicate found, if any */
  duplicateType?: 'isbn' | 'triad';
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
   * Checks if a book with the given triad (author, title, format) already exists
   *
   * The check is performed using normalized values (lowercase, no special chars)
   * to ensure consistent duplicate detection.
   *
   * @param author - The normalized author name (lowercase, trimmed)
   * @param title - The normalized book title (lowercase, trimmed)
   * @param format - The book format (e.g., 'pdf', 'epub')
   * @returns Promise resolving to true if triad exists, false otherwise
   *
   * @remarks The application layer must normalize author and title before calling this method.
   * Normalization: lowercase conversion and trimming of whitespace.
   */
  existsByTriad(author: string, title: string, format: string): Promise<boolean>;

  /**
   * Performs a comprehensive duplicate check for both ISBN and triad
   *
   * Use this before creating a book to get detailed duplicate information.
   *
   * @param params - Object containing isbn (optional, normalized), author (normalized), title (normalized), and format
   * @returns Promise resolving to duplicate check result
   *
   * @remarks The application layer must normalize isbn, author, and title before calling this method.
   * - ISBN: Already normalized by the ISBN value object (without hyphens, uppercase)
   * - Author/Title: lowercase conversion and trimming of whitespace
   */
  checkDuplicate(params: {
    isbn?: string | null;
    author: string;
    title: string;
    format: string;
  }): Promise<DuplicateCheckResult>;

  /**
   * Saves a new book with its embedding vector
   *
   * This is an atomic operation that persists both the book data
   * and its vector embedding in a single transaction.
   *
   * @param params - The book and embedding to save
   * @returns Promise resolving to the saved Book
   * @throws BookAlreadyExistsError if ISBN or triad duplicate exists
   */
  save(params: SaveBookParams): Promise<Book>;

  /**
   * Updates an existing book's mutable fields (available, path)
   *
   * Note: Fields that are part of the embedding (title, author, description,
   * type, categories, format) are immutable after creation.
   *
   * @param book - The book with updated values
   * @returns Promise resolving to the updated Book
   * @throws BookNotFoundError if the book doesn't exist
   */
  update(book: Book): Promise<Book>;

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
