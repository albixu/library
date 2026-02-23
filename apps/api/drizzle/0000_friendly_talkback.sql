-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
CREATE TABLE "authors" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(300) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "authors_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "book_authors" (
	"book_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "book_authors_book_id_author_id_pk" PRIMARY KEY("book_id","author_id")
);
--> statement-breakpoint
CREATE TABLE "book_categories" (
	"book_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "book_categories_book_id_category_id_pk" PRIMARY KEY("book_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "books" (
	"id" uuid PRIMARY KEY NOT NULL,
	"isbn" varchar(13),
	"title" varchar(500) NOT NULL,
	"original_description" text NOT NULL,
	"description" text NOT NULL,
	"language" varchar(10) NOT NULL,
	"type_id" uuid NOT NULL,
	"format" varchar(50) NOT NULL,
	"level_id" uuid,
	"available" boolean DEFAULT false NOT NULL,
	"path" varchar(1000),
	"embedding" vector(768),
	"normalized_title" varchar(500) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"type_id" uuid NOT NULL,
	"description" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_name_type_unique" UNIQUE("name","type_id")
);
--> statement-breakpoint
CREATE TABLE "levels" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "levels_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "type_levels" (
	"type_id" uuid NOT NULL,
	"level_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "type_levels_type_id_level_id_pk" PRIMARY KEY("type_id","level_id")
);
--> statement-breakpoint
CREATE TABLE "types" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "book_authors" ADD CONSTRAINT "book_authors_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_authors" ADD CONSTRAINT "book_authors_author_id_authors_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_categories" ADD CONSTRAINT "book_categories_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_categories" ADD CONSTRAINT "book_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "books" ADD CONSTRAINT "books_type_id_types_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "books" ADD CONSTRAINT "books_level_id_levels_id_fk" FOREIGN KEY ("level_id") REFERENCES "public"."levels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_type_id_types_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "type_levels" ADD CONSTRAINT "type_levels_type_id_types_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "type_levels" ADD CONSTRAINT "type_levels_level_id_levels_id_fk" FOREIGN KEY ("level_id") REFERENCES "public"."levels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "authors_name_idx" ON "authors" USING btree ("name");--> statement-breakpoint
CREATE INDEX "book_authors_author_idx" ON "book_authors" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "book_categories_category_idx" ON "book_categories" USING btree ("category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "books_isbn_unique_idx" ON "books" USING btree ("isbn");--> statement-breakpoint
CREATE INDEX "books_title_idx" ON "books" USING btree ("title");--> statement-breakpoint
CREATE INDEX "books_type_id_idx" ON "books" USING btree ("type_id");--> statement-breakpoint
CREATE INDEX "books_level_id_idx" ON "books" USING btree ("level_id");--> statement-breakpoint
CREATE INDEX "categories_type_idx" ON "categories" USING btree ("type_id");--> statement-breakpoint
CREATE INDEX "categories_name_idx" ON "categories" USING btree ("name");--> statement-breakpoint
CREATE INDEX "levels_name_idx" ON "levels" USING btree ("name");--> statement-breakpoint
CREATE INDEX "type_levels_type_idx" ON "type_levels" USING btree ("type_id");--> statement-breakpoint
CREATE INDEX "type_levels_level_idx" ON "type_levels" USING btree ("level_id");--> statement-breakpoint
CREATE INDEX "types_name_idx" ON "types" USING btree ("name");
--> statement-breakpoint
-- ================================
-- Initial Data: Book Types
-- ================================
-- Note: Using gen_random_uuid() for PostgreSQL 13+ (built-in)
-- ON CONFLICT ensures idempotency for re-running migrations
INSERT INTO types (id, name) VALUES
    (gen_random_uuid(), 'technical'),
    (gen_random_uuid(), 'novel'),
    (gen_random_uuid(), 'biography')
ON CONFLICT (name) DO NOTHING;