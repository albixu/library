-- ================================
-- PostgreSQL initialization script
-- Runs on first container startup
-- ================================

-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Confirm extension is installed
SELECT 'pgvector extension installed successfully' AS status;
