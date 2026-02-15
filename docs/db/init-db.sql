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

-- Categories table (reusable categories for books)
CREATE TABLE IF NOT EXISTS categories (
    -- Primary key (UUID v4)
    id UUID PRIMARY KEY,
    
    -- Required fields
    name VARCHAR(100) NOT NULL UNIQUE,
    
    -- Optional fields
    description VARCHAR(500),
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Books table (updated - removed author column, added type_id reference)
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

-- Authors indexes
CREATE INDEX IF NOT EXISTS idx_authors_name 
    ON authors (name);

-- Categories indexes
CREATE INDEX IF NOT EXISTS idx_categories_name 
    ON categories (name);

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

-- ================================
-- Confirmation
-- ================================

SELECT 'Database initialized successfully' AS status;
