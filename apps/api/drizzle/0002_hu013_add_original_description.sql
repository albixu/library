-- HU-013: Add original_description column to books table
-- This migration:
-- 1. Adds 'original_description' column to 'books' table
-- 2. Copies existing description values to original_description
-- 3. Makes the column NOT NULL after data migration
-- 4. Adds language column if not exists (VARCHAR 10 NOT NULL for ISO 639-1)

-- Add original_description column (nullable initially for migration)
ALTER TABLE "books" ADD COLUMN "original_description" text;
--> statement-breakpoint

-- Copy existing description values to original_description for existing records
UPDATE "books" SET "original_description" = "description" WHERE "original_description" IS NULL;
--> statement-breakpoint

-- Make original_description NOT NULL after migration
ALTER TABLE "books" ALTER COLUMN "original_description" SET NOT NULL;
--> statement-breakpoint

-- Add language column if not exists (for existing books, default to 'en')
ALTER TABLE "books" ADD COLUMN IF NOT EXISTS "language" varchar(10) DEFAULT 'en' NOT NULL;
--> statement-breakpoint

-- Remove default from language column after migration
ALTER TABLE "books" ALTER COLUMN "language" DROP DEFAULT;
