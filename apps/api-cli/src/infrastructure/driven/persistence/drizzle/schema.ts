/**
 * Drizzle ORM Schema Definitions
 *
 * Defines the database schema for PostgreSQL using Drizzle ORM.
 * This schema supports pgvector for embedding storage.
 *
 * Changes in HU-002:
 * - Added 'types' table (replaces book_type enum)
 * - Added 'authors' table with N:M relationship to books
 * - Added 'book_authors' junction table
 * - Modified 'books' table: removed author column, added type_id reference
 */

import { pgTable, uuid, varchar, text, timestamp, boolean, index, uniqueIndex, primaryKey } from 'drizzle-orm/pg-core';
import { vector } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * Types table
 *
 * Stores book type classifications (replaces the old book_type enum).
 * Examples: technical, novel, biography
 */
export const types = pgTable('types', {
  id: uuid('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('types_name_idx').on(table.name),
]);

/**
 * Authors table
 *
 * Stores author information with unique names.
 * Has N:M relationship with books via book_authors junction table.
 */
export const authors = pgTable('authors', {
  id: uuid('id').primaryKey(),
  name: varchar('name', { length: 300 }).notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('authors_name_idx').on(table.name),
]);

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
 *
 * Changes in HU-002:
 * - Removed 'author' and 'normalized_author' columns (now N:M via book_authors)
 * - Added 'type_id' foreign key to types table
 * - Removed 'type' column (was string, now referenced)
 */
export const books = pgTable('books', {
  id: uuid('id').primaryKey(),
  isbn: varchar('isbn', { length: 13 }),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description').notNull(),
  typeId: uuid('type_id').notNull().references(() => types.id),
  format: varchar('format', { length: 50 }).notNull(),
  available: boolean('available').notNull().default(false),
  path: varchar('path', { length: 1000 }),
  embedding: vector('embedding', { dimensions: 768 }),
  // Normalized field for duplicate detection (stored lowercase)
  normalizedTitle: varchar('normalized_title', { length: 500 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  // Unique constraint on ISBN (when present)
  uniqueIndex('books_isbn_unique_idx').on(table.isbn),
  // Index for common queries
  index('books_title_idx').on(table.title),
  index('books_type_id_idx').on(table.typeId),
]);

/**
 * Book-Authors junction table
 *
 * Many-to-many relationship between books and authors.
 */
export const bookAuthors = pgTable('book_authors', {
  bookId: uuid('book_id').notNull().references(() => books.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id').notNull().references(() => authors.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  // Composite primary key
  primaryKey({ columns: [table.bookId, table.authorId] }),
  // Index for querying books by author
  index('book_authors_author_idx').on(table.authorId),
]);

/**
 * Book-Categories junction table
 *
 * Many-to-many relationship between books and categories.
 */
export const bookCategories = pgTable('book_categories', {
  bookId: uuid('book_id').notNull().references(() => books.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id').notNull().references(() => categories.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  // Composite primary key
  primaryKey({ columns: [table.bookId, table.categoryId] }),
  // Index for querying books by category
  index('book_categories_category_idx').on(table.categoryId),
]);

/**
 * Type exports for use in repositories
 */
export type TypeInsert = typeof types.$inferInsert;
export type TypeSelect = typeof types.$inferSelect;
export type AuthorInsert = typeof authors.$inferInsert;
export type AuthorSelect = typeof authors.$inferSelect;
export type CategoryInsert = typeof categories.$inferInsert;
export type CategorySelect = typeof categories.$inferSelect;
export type BookInsert = typeof books.$inferInsert;
export type BookSelect = typeof books.$inferSelect;
export type BookAuthorInsert = typeof bookAuthors.$inferInsert;
export type BookCategoryInsert = typeof bookCategories.$inferInsert;
