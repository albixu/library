-- HU-008: Type-Category-Level Relationships Migration
-- This migration:
-- 1. Creates the 'levels' table
-- 2. Creates the 'type_levels' junction table for N:N relationship
-- 3. Adds 'type_id' column to 'categories' table
-- 4. Changes 'books.level' from enum to 'level_id' FK

-- Create levels table
CREATE TABLE IF NOT EXISTS "levels" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "levels_name_unique" UNIQUE("name")
);
--> statement-breakpoint

-- Create type_levels junction table
CREATE TABLE IF NOT EXISTS "type_levels" (
	"type_id" uuid NOT NULL,
	"level_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "type_levels_type_id_level_id_pk" PRIMARY KEY("type_id","level_id")
);
--> statement-breakpoint

-- Add type_id column to categories (initially nullable for migration, then set to NOT NULL)
ALTER TABLE "categories" ADD COLUMN "type_id" uuid;
--> statement-breakpoint

-- Add level_id column to books (nullable FK to levels)
ALTER TABLE "books" ADD COLUMN "level_id" uuid;
--> statement-breakpoint

-- Drop the old level column from books (was enum)
ALTER TABLE "books" DROP COLUMN IF EXISTS "level";
--> statement-breakpoint

-- Add foreign key constraints
ALTER TABLE "type_levels" ADD CONSTRAINT "type_levels_type_id_types_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."types"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "type_levels" ADD CONSTRAINT "type_levels_level_id_levels_id_fk" FOREIGN KEY ("level_id") REFERENCES "public"."levels"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_type_id_types_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."types"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "books" ADD CONSTRAINT "books_level_id_levels_id_fk" FOREIGN KEY ("level_id") REFERENCES "public"."levels"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint

-- Create indexes
CREATE INDEX IF NOT EXISTS "levels_name_idx" ON "levels" USING btree ("name");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "type_levels_type_idx" ON "type_levels" USING btree ("type_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "type_levels_level_idx" ON "type_levels" USING btree ("level_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "categories_type_idx" ON "categories" USING btree ("type_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "categories_name_idx" ON "categories" USING btree ("name");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "books_level_id_idx" ON "books" USING btree ("level_id");
--> statement-breakpoint

-- Drop old categories unique constraint and create new one
DROP INDEX IF EXISTS "categories_name_unique_idx";
--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_name_type_unique" UNIQUE("name","type_id");
--> statement-breakpoint

-- Drop old books level index
DROP INDEX IF EXISTS "books_level_idx";
--> statement-breakpoint

-- Make categories.type_id NOT NULL after migration data is handled
-- Note: This should be done after populating type_id values for existing categories
-- ALTER TABLE "categories" ALTER COLUMN "type_id" SET NOT NULL;

-- Drop the book_level enum type if it exists
DROP TYPE IF EXISTS "book_level";
