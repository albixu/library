/**
 * Drizzle ORM Schema Definitions
 *
 * Defines the database schema for PostgreSQL using Drizzle ORM.
 * This schema supports pgvector for embedding storage.
 */

import { pgTable, uuid, varchar, text, timestamp, boolean, index, uniqueIndex, primaryKey } from 'drizzle-orm/pg-core';
import { vector } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * Categories table
 *
 * Stores book categories with case-insensitive unique names.
 * Names are stored lowercase for consistent duplicate detection.
 */
export const categories = pgTable('categories', {
  id: uuid('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: varchar('description', { length: 500 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  // Functional unique index on lower(name) for true case-insensitive uniqueness
  uniqueIndex('categories_name_unique_idx').on(sql`lower(${table.name})`),
]);

/**
 * Books table
 *
 * Stores book information with vector embeddings for semantic search.
 * The embedding column uses pgvector with 768 dimensions (nomic-embed-text).
 */
export const books = pgTable('books', {
  id: uuid('id').primaryKey(),
  isbn: varchar('isbn', { length: 13 }),
  title: varchar('title', { length: 500 }).notNull(),
  author: varchar('author', { length: 300 }).notNull(),
  description: text('description').notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  format: varchar('format', { length: 50 }).notNull(),
  available: boolean('available').notNull().default(false),
  path: varchar('path', { length: 1000 }),
  embedding: vector('embedding', { dimensions: 768 }),
  // Normalized fields for duplicate detection (stored lowercase, no special chars)
  normalizedTitle: varchar('normalized_title', { length: 500 }).notNull(),
  normalizedAuthor: varchar('normalized_author', { length: 300 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  // Unique constraint on ISBN (when present)
  uniqueIndex('books_isbn_unique_idx').on(table.isbn),
  // Unique constraint on normalized triad for duplicate detection
  uniqueIndex('books_triad_unique_idx').on(
    table.normalizedAuthor,
    table.normalizedTitle,
    table.format
  ),
  // Index for common queries
  index('books_author_idx').on(table.author),
  index('books_title_idx').on(table.title),
]);

/**
 * Book-Categories junction table
 *
 * Many-to-many relationship between books and categories.
 */
export const bookCategories = pgTable('book_categories', {
  bookId: uuid('book_id').notNull().references(() => books.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id').notNull().references(() => categories.id, { onDelete: 'restrict' }),
}, (table) => [
  // Composite primary key
  primaryKey({ columns: [table.bookId, table.categoryId] }),
  // Index for querying books by category
  index('book_categories_category_idx').on(table.categoryId),
]);

/**
 * Type exports for use in repositories
 */
export type CategoryInsert = typeof categories.$inferInsert;
export type CategorySelect = typeof categories.$inferSelect;
export type BookInsert = typeof books.$inferInsert;
export type BookSelect = typeof books.$inferSelect;
export type BookCategoryInsert = typeof bookCategories.$inferInsert;
