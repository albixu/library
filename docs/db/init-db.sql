-- ================================
-- PostgreSQL initialization script
-- Runs on first container startup
-- ================================

-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- ================================
-- ENUM Types
-- ================================

-- Book file format (kept as enum - fixed set of values)
CREATE TYPE book_format AS ENUM (
    'epub',
    'pdf',
    'mobi',
    'azw3',
    'djvu',
    'cbz',
    'cbr',
    'txt',
    'other'
);

-- Note: book_level ENUM has been removed (HU-008)
-- Levels are now stored in the 'levels' table with dynamic values

-- ================================
-- Tables
-- ================================

-- Types table (replaces book_type enum - dynamic types stored in DB)
CREATE TABLE IF NOT EXISTS types (
    -- Primary key (UUID v4)
    id UUID PRIMARY KEY,
    
    -- Required fields
    name VARCHAR(50) NOT NULL UNIQUE,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Levels table (HU-008 - replaces book_level enum - dynamic levels stored in DB)
CREATE TABLE IF NOT EXISTS levels (
    -- Primary key (UUID v4)
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Required fields
    name VARCHAR(100) NOT NULL UNIQUE,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Junction table for many-to-many relationship between types and levels (HU-008)
CREATE TABLE IF NOT EXISTS type_levels (
    type_id UUID NOT NULL REFERENCES types(id) ON DELETE CASCADE,
    level_id UUID NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
    
    -- Composite primary key
    PRIMARY KEY (type_id, level_id),
    
    -- Timestamp for when the relationship was created
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Authors table (new - N:M relationship with books)
CREATE TABLE IF NOT EXISTS authors (
    -- Primary key (UUID v4)
    id UUID PRIMARY KEY,
    
    -- Required fields
    name VARCHAR(300) NOT NULL UNIQUE,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Categories table (HU-008 - now belongs to a specific type)
CREATE TABLE IF NOT EXISTS categories (
    -- Primary key (UUID v4)
    id UUID PRIMARY KEY,
    
    -- Required fields
    name VARCHAR(100) NOT NULL,
    
    -- HU-008: Each category belongs to exactly one type
    type_id UUID NOT NULL REFERENCES types(id) ON DELETE RESTRICT,
    
    -- Optional fields
    description VARCHAR(500),
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- HU-008: Category name must be unique within a type (not globally)
    CONSTRAINT categories_name_type_unique UNIQUE (name, type_id)
);

-- Books table (HU-008 - level changed from enum to FK referencing levels table)
CREATE TABLE IF NOT EXISTS books (
    -- Primary key (UUID v4)
    id UUID PRIMARY KEY,
    
    -- Required fields
    title VARCHAR(500) NOT NULL,
    type_id UUID NOT NULL REFERENCES types(id),
    format book_format NOT NULL,
    available BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Optional fields
    isbn VARCHAR(13) UNIQUE,
    description VARCHAR(5000),
    path VARCHAR(1000),
    
    -- HU-008: Level is now a FK to levels table instead of enum
    level_id UUID REFERENCES levels(id) ON DELETE SET NULL,
    
    -- Normalized field for duplicate detection (stored lowercase)
    normalized_title VARCHAR(500) NOT NULL,
    
    -- Vector embedding for semantic search (nomic-embed-text: 768 dimensions)
    embedding vector(768),
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Junction table for many-to-many relationship between books and authors
CREATE TABLE IF NOT EXISTS book_authors (
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES authors(id) ON DELETE RESTRICT,
    
    -- Composite primary key
    PRIMARY KEY (book_id, author_id),
    
    -- Timestamp for when the relationship was created
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Junction table for many-to-many relationship between books and categories
CREATE TABLE IF NOT EXISTS book_categories (
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    
    -- Composite primary key
    PRIMARY KEY (book_id, category_id),
    
    -- Timestamp for when the relationship was created
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================
-- Indexes
-- ================================

-- Types indexes
CREATE INDEX IF NOT EXISTS idx_types_name 
    ON types (name);

-- Levels indexes (HU-008)
CREATE INDEX IF NOT EXISTS idx_levels_name 
    ON levels (name);

-- Type-Levels junction table indexes (HU-008)
CREATE INDEX IF NOT EXISTS idx_type_levels_type_id 
    ON type_levels (type_id);

CREATE INDEX IF NOT EXISTS idx_type_levels_level_id 
    ON type_levels (level_id);

-- Authors indexes
CREATE INDEX IF NOT EXISTS idx_authors_name 
    ON authors (name);

-- Categories indexes
CREATE INDEX IF NOT EXISTS idx_categories_name 
    ON categories (name);

-- HU-008: Index for filtering categories by type
CREATE INDEX IF NOT EXISTS idx_categories_type_id 
    ON categories (type_id);

-- Books indexes
-- Index for semantic search using HNSW (faster for high-dimensional vectors)
-- ef_construction: higher = better recall, slower build
-- m: connections per node, higher = better recall, more memory
CREATE INDEX IF NOT EXISTS idx_books_embedding 
    ON books 
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- Index for faster lookups by ISBN
CREATE INDEX IF NOT EXISTS idx_books_isbn 
    ON books (isbn) 
    WHERE isbn IS NOT NULL;

-- Index for type filtering (by type_id)
CREATE INDEX IF NOT EXISTS idx_books_type_id 
    ON books (type_id);

-- Index for title search
CREATE INDEX IF NOT EXISTS idx_books_title 
    ON books (title);

-- Index for filtering by availability
CREATE INDEX IF NOT EXISTS idx_books_available 
    ON books (available) 
    WHERE available = TRUE;

-- HU-008: Index for filtering by level_id (changed from enum to FK)
CREATE INDEX IF NOT EXISTS idx_books_level_id 
    ON books (level_id) 
    WHERE level_id IS NOT NULL;

-- Book authors junction table indexes
-- Index for finding all authors of a book
CREATE INDEX IF NOT EXISTS idx_book_authors_book_id 
    ON book_authors (book_id);

-- Index for finding all books by an author
CREATE INDEX IF NOT EXISTS idx_book_authors_author_id 
    ON book_authors (author_id);

-- Book categories junction table indexes
-- Index for finding all categories of a book
CREATE INDEX IF NOT EXISTS idx_book_categories_book_id 
    ON book_categories (book_id);

-- Index for finding all books in a category
CREATE INDEX IF NOT EXISTS idx_book_categories_category_id 
    ON book_categories (category_id);

-- ================================
-- Triggers
-- ================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_types_updated_at
    BEFORE UPDATE ON types
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_levels_updated_at
    BEFORE UPDATE ON levels
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_authors_updated_at
    BEFORE UPDATE ON authors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_books_updated_at
    BEFORE UPDATE ON books
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================
-- Initial Data: Book Types
-- ================================

INSERT INTO types (id, name) VALUES
    (gen_random_uuid(), 'technical'),
    (gen_random_uuid(), 'novel'),
    (gen_random_uuid(), 'biography')
ON CONFLICT (name) DO NOTHING;

-- ================================
-- Constraints Notes
-- ================================

-- Ensure a book has at least one category (enforced at application level)
-- Ensure a book has at least one author (enforced at application level)
-- Note: These cannot be enforced at DB level without triggers
-- The application layer will validate these constraints

-- HU-008: Category-Type and Level-Type relationships
-- - Each category belongs to exactly one type (enforced by FK + UNIQUE constraint)
-- - Each level can be associated with multiple types via type_levels junction table
-- - A book's level must be valid for its type (enforced at application level)
-- - A book's categories must all belong to the book's type (enforced at application level)

-- ================================
-- Confirmation
-- ================================

SELECT 'Database initialized successfully' AS status;
