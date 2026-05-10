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
 *
 * Changes in HU-008:
 * - Removed 'book_level' enum (replaced by 'levels' table)
 * - Added 'levels' table for dynamic level values
 * - Added 'type_levels' junction table for N:N relationship between types and levels
 * - Added 'type_id' to 'categories' table (1:N relationship with types)
 * - Changed 'books.level' to 'books.level_id' as FK to levels table
 */

import { pgTable, uuid, varchar, text, timestamp, boolean, index, uniqueIndex, primaryKey, unique } from 'drizzle-orm/pg-core';
import { vector } from 'drizzle-orm/pg-core';

// Note: book_level ENUM has been removed in HU-008
// Levels are now stored in the 'levels' table with dynamic values

/**
 * Types table
 *
 * Stores book type classifications (replaces the old book_type enum).
 * Examples: technical, novel, biography
 *
 * HU-008: Types now have N:N relationship with levels via type_levels table
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
 * Changes in HU-002:
 * - Added 'types' table (replaces book_type enum)
 * - Added 'authors' table with N:M relationship to books
 * - Added 'book_authors' junction table
 * - Modified 'books' table: removed author column, added type_id reference
 *
 * Changes in HU-008:
 * - Removed 'book_level' enum (replaced by 'levels' table)
 * - Added 'levels' table for dynamic level values
 * - Added 'type_levels' junction table for N:N relationship between types and levels
 * - Added 'type_id' to 'categories' table (1:N relationship with types)
 * - Changed 'books.level' to 'books.level_id' as FK to levels table
 *
 * Changes in HU-039:
 * - Added 'user_book_favorites' junction table (user ↔ book favorites)
 * - Added 'user_book_downloads' junction table (user ↔ book downloads)
 */
export const levels = pgTable('levels', {
  id: uuid('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('levels_name_idx').on(table.name),
]);

/**
 * Type-Levels junction table (HU-008)
 *
 * Many-to-many relationship between types and levels.
 * A type can have multiple valid levels, and a level can be valid for multiple types.
 */
export const typeLevels = pgTable('type_levels', {
  typeId: uuid('type_id').notNull().references(() => types.id, { onDelete: 'cascade' }),
  levelId: uuid('level_id').notNull().references(() => levels.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  // Composite primary key
  primaryKey({ columns: [table.typeId, table.levelId] }),
  // Index for querying levels by type
  index('type_levels_type_idx').on(table.typeId),
  // Index for querying types by level
  index('type_levels_level_idx').on(table.levelId),
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
 * Stores book categories.
 *
 * HU-008 Changes:
 * - Added type_id FK: each category belongs to exactly one type
 * - Changed unique constraint: name is unique within a type (not globally)
 */
export const categories = pgTable('categories', {
  id: uuid('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  typeId: uuid('type_id').notNull().references(() => types.id, { onDelete: 'restrict' }),
  description: varchar('description', { length: 500 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  // HU-008: Category name must be unique within a type (not globally)
  unique('categories_name_type_unique').on(table.name, table.typeId),
  // Index for filtering categories by type
  index('categories_type_idx').on(table.typeId),
  // Index for name lookups
  index('categories_name_idx').on(table.name),
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
 *
 * Changes in HU-008:
 * - Changed 'level' from book_level enum to 'level_id' FK referencing levels table
 *
 * Changes in HU-013:
 * - Added 'original_description' to store description in original language
 * - 'description' now always contains Spanish text (translated if needed)
 * - Added 'language' column (ISO 639-1 code)
 */
export const books = pgTable('books', {
  id: uuid('id').primaryKey(),
  isbn: varchar('isbn', { length: 32 }),
  title: varchar('title', { length: 500 }).notNull(),
  originalDescription: text('original_description').notNull(),
  description: text('description').notNull(),
  language: varchar('language', { length: 10 }).notNull(),
  typeId: uuid('type_id').notNull().references(() => types.id),
  format: varchar('format', { length: 50 }).notNull(),
  // HU-008: Level changed from enum to FK referencing levels table
  levelId: uuid('level_id').references(() => levels.id, { onDelete: 'set null' }),
  available: boolean('available').notNull().default(true),
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
  // HU-008: Index for level_id filtering (nullable FK)
  index('books_level_id_idx').on(table.levelId),
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
 * Users table (HU-038)
 *
 * Stores registered user accounts with hashed passwords.
 * Used for authentication with JWT.
 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('users_email_idx').on(table.email),
]);

/**
 * Password reset tokens table (HU-038)
 *
 * Stores hashed tokens for password recovery flow.
 * Tokens expire and can only be used once.
 */
export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
}, (table) => [
  index('password_reset_tokens_user_idx').on(table.userId),
]);

/**
 * Type exports for use in repositories
 */
export type TypeInsert = typeof types.$inferInsert;
export type TypeSelect = typeof types.$inferSelect;
export type LevelInsert = typeof levels.$inferInsert;
export type LevelSelect = typeof levels.$inferSelect;
export type TypeLevelInsert = typeof typeLevels.$inferInsert;
export type TypeLevelSelect = typeof typeLevels.$inferSelect;
export type AuthorInsert = typeof authors.$inferInsert;
export type AuthorSelect = typeof authors.$inferSelect;
export type CategoryInsert = typeof categories.$inferInsert;
export type CategorySelect = typeof categories.$inferSelect;
export type BookInsert = typeof books.$inferInsert;
export type BookSelect = typeof books.$inferSelect;
export type BookAuthorInsert = typeof bookAuthors.$inferInsert;
export type BookCategoryInsert = typeof bookCategories.$inferInsert;
export type UserInsert = typeof users.$inferInsert;
export type UserSelect = typeof users.$inferSelect;
export type PasswordResetTokenInsert = typeof passwordResetTokens.$inferInsert;
export type PasswordResetTokenSelect = typeof passwordResetTokens.$inferSelect;

/**
 * User-Book Favorites junction table (HU-039)
 *
 * Tracks which books a user has marked as favorites.
 * Composite primary key (user_id, book_id) prevents duplicates.
 */
export const userBookFavorites = pgTable('user_book_favorites', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  bookId: uuid('book_id').notNull().references(() => books.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  // Composite primary key
  primaryKey({ columns: [table.userId, table.bookId] }),
  // Index for querying favorites by user
  index('user_book_favorites_user_idx').on(table.userId),
]);

/**
 * User-Book Downloads junction table (HU-039)
 *
 * Tracks which books a user has downloaded.
 * Composite primary key (user_id, book_id) — one record per user+book pair.
 */
export const userBookDownloads = pgTable('user_book_downloads', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  bookId: uuid('book_id').notNull().references(() => books.id, { onDelete: 'cascade' }),
  downloadedAt: timestamp('downloaded_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  // Composite primary key
  primaryKey({ columns: [table.userId, table.bookId] }),
]);

export type UserBookFavoriteInsert = typeof userBookFavorites.$inferInsert;
export type UserBookFavoriteSelect = typeof userBookFavorites.$inferSelect;
export type UserBookDownloadInsert = typeof userBookDownloads.$inferInsert;
export type UserBookDownloadSelect = typeof userBookDownloads.$inferSelect;
