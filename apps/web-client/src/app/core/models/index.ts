// =============================================================================
// Core Models - API Response Types
// =============================================================================

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
}

/**
 * API error structure
 */
export interface ApiError {
  message: string;
  details?: string[];
}

// =============================================================================
// Book-related Types
// =============================================================================

/**
 * Author entity
 */
export interface Author {
  id: string;
  name: string;
}

/**
 * Category entity
 */
export interface Category {
  id: string;
  name: string;
}

/**
 * Book type entity
 */
export interface BookType {
  id: string;
  name: string;
}

/**
 * Book level entity
 */
export interface BookLevel {
  id: string;
  name: string;
}

/**
 * Category with extended info (includes typeId and description)
 */
export interface CategoryListItem {
  id: string;
  name: string;
  typeId: string;
  description: string | null;
}

/**
 * Book format enum values
 */
export type BookFormat =
  | 'epub'
  | 'pdf'
  | 'mobi'
  | 'azw3'
  | 'djvu'
  | 'cbz'
  | 'cbr'
  | 'txt'
  | 'other';

/**
 * Book level enum values
 */
export type BookLevelName =
  | 'Beginner'
  | 'Intermediate'
  | 'Advanced'
  | 'Beginner to Intermediate'
  | 'Intermediate to Advanced';

/**
 * Book search result item (from GET /books)
 */
export interface Book {
  id: string;
  isbn: string | null;
  title: string;
  authors: Author[];
  type: string;
  categories: Category[];
  level: BookLevelName | null;
  format: BookFormat;
  originalDescription: string;
  description: string;
  language: string;
  available: boolean;
  similarityScore: number | null;
}

/**
 * Pagination info for search results
 */
export interface PaginationInfo {
  limit: number;
  hasNextPage: boolean;
  nextCursor: string | null;
  totalCount: number;
}

/**
 * Book search response data
 */
export interface BookSearchData {
  items: Book[];
  pagination: PaginationInfo;
}

// =============================================================================
// Search Filters
// =============================================================================

/**
 * Search filters for book search
 */
export interface SearchFilters {
  isbn?: string;
  title?: string;
  author?: string;
  type?: string;
  categories?: string[];
  levels?: string[];
  text?: string;
}

/**
 * Pagination parameters for search
 */
export interface PaginationParams {
  limit?: number;
  cursor?: string;
}

// =============================================================================
// API Response Types
// =============================================================================

export type BookSearchResponse = ApiResponse<BookSearchData>;
export type BookTypeListResponse = ApiResponse<BookType[]>;
export type CategoryListResponse = ApiResponse<CategoryListItem[]>;
export type BookLevelListResponse = ApiResponse<BookLevel[]>;
