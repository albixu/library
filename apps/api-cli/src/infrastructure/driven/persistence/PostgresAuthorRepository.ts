/**
 * PostgresAuthorRepository Adapter
 *
 * Implements the AuthorRepository port using Drizzle ORM with PostgreSQL.
 * This is a driven/output adapter in the hexagonal architecture.
 */

import { eq, inArray, sql } from 'drizzle-orm';
import { Author } from '../../../domain/entities/Author.js';
import { AuthorAlreadyExistsError } from '../../../domain/errors/DomainErrors.js';
import type { AuthorRepository } from '../../../application/ports/AuthorRepository.js';
import { authors, type AuthorSelect } from './drizzle/schema.js';
import { AuthorMapper } from './mappers/AuthorMapper.js';
import { generateUUID } from '../../../shared/utils/uuid.js';

/**
 * Database type that supports our operations
 * This is a generic interface that works with any Drizzle PostgreSQL connection
 */
interface DrizzleDb {
  select: () => {
    from: (table: typeof authors) => {
      where: (condition: unknown) => Promise<AuthorSelect[]>;
    };
  };
  insert: (table: typeof authors) => {
    values: (data: unknown) => {
      returning: () => Promise<AuthorSelect[]>;
      onConflictDoNothing: () => {
        returning: () => Promise<AuthorSelect[]>;
      };
    };
  };
  query: {
    authors: {
      findFirst: (options?: { where?: unknown }) => Promise<AuthorSelect | null>;
      findMany: (options?: { where?: unknown }) => Promise<AuthorSelect[]>;
    };
  };
}

/**
 * PostgresAuthorRepository
 *
 * Adapter that implements AuthorRepository using Drizzle ORM.
 * Provides CRUD operations for authors with unique name constraint.
 */
export class PostgresAuthorRepository implements AuthorRepository {
  constructor(readonly db: DrizzleDb) {}

  /**
   * Finds an author by its unique identifier
   */
  async findById(id: string): Promise<Author | null> {
    const result = await this.db.query.authors.findFirst({
      where: eq(authors.id, id),
    });

    return result ? AuthorMapper.toDomain(result) : null;
  }

  /**
   * Finds an author by its name (exact match)
   */
  async findByName(name: string): Promise<Author | null> {
    const trimmedName = name.trim();
    
    const result = await this.db.query.authors.findFirst({
      where: eq(authors.name, trimmedName),
    });

    return result ? AuthorMapper.toDomain(result) : null;
  }

  /**
   * Finds multiple authors by their names
   */
  async findByNames(names: string[]): Promise<Author[]> {
    if (names.length === 0) {
      return [];
    }

    const trimmedNames = names.map((n) => n.trim());
    
    const results = await this.db.query.authors.findMany({
      where: inArray(authors.name, trimmedNames),
    });

    return AuthorMapper.toDomainList(results);
  }

  /**
   * Finds an author by name or creates it if it doesn't exist
   */
  async findOrCreate(name: string): Promise<Author> {
    const existing = await this.findByName(name);
    
    if (existing) {
      return existing;
    }

    // Create new author
    const newAuthor = Author.create({
      id: generateUUID(),
      name: name,
    });

    try {
      return await this.save(newAuthor);
    } catch (error) {
      // Handle concurrent creation: if another process created the author
      // in between our check and save, return the existing one instead of
      // propagating an AuthorAlreadyExistsError.
      if (error instanceof AuthorAlreadyExistsError) {
        const concurrentExisting = await this.findByName(name);
        if (concurrentExisting) {
          return concurrentExisting;
        }
      }
      throw error;
    }
  }

  /**
   * Finds or creates multiple authors by their names
   * Returns authors in the same order as input names
   */
  async findOrCreateMany(names: string[]): Promise<Author[]> {
    if (names.length === 0) {
      return [];
    }

    const trimmedNames = names.map((n) => n.trim());
    
    // Find existing authors
    const existingAuthors = await this.findByNames(trimmedNames);
    const existingNamesSet = new Set(existingAuthors.map((a) => a.name));

    // Determine which authors need to be created
    const namesToCreate = trimmedNames.filter((n) => !existingNamesSet.has(n));

    // Create new authors if any
    if (namesToCreate.length > 0) {
      const authorsToInsert = namesToCreate.map((name) =>
        Author.create({
          id: generateUUID(),
          name,
        })
      );

      const insertRecords = AuthorMapper.toPersistenceList(authorsToInsert);
      
      // Insert with onConflictDoNothing - some may be skipped by concurrent writers
      await this.db
        .insert(authors)
        .values(insertRecords)
        .onConflictDoNothing()
        .returning();
    }

    // Re-fetch all authors to ensure we have complete data
    // This handles race conditions where concurrent writers inserted authors
    // between our initial check and our insert attempt
    const allAuthors = await this.findByNames(trimmedNames);
    const authorMap = new Map(allAuthors.map((a) => [a.name, a]));

    // Build result in input order and validate completeness
    const result: Author[] = [];
    for (const name of trimmedNames) {
      const author = authorMap.get(name);
      if (!author) {
        const missingNames = trimmedNames.filter((n) => !authorMap.has(n));
        throw new Error(
          `Failed to find or create the requested authors: ${missingNames.join(', ')}`
        );
      }
      result.push(author);
    }

    return result;
  }

  /**
   * Saves a new author to the database
   */
  async save(author: Author): Promise<Author> {
    const record = AuthorMapper.toPersistence(author);

    try {
      const result = await this.db
        .insert(authors)
        .values(record)
        .returning();

      const inserted = result[0];
      if (!inserted) {
        throw new Error('Failed to insert author - no record returned');
      }

      return AuthorMapper.toDomain(inserted);
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        throw new AuthorAlreadyExistsError(author.name);
      }
      throw error;
    }
  }

  /**
   * Retrieves all authors
   */
  async findAll(): Promise<Author[]> {
    const results = await this.db.query.authors.findMany();
    return AuthorMapper.toDomainList(results);
  }

  /**
   * Counts the total number of authors
   */
  async count(): Promise<number> {
    const result = await this.db
      .select()
      .from(authors)
      .where(sql`1=1`);
    return result.length;
  }

  /**
   * Checks if an error is a duplicate key violation
   */
  private isDuplicateKeyError(error: unknown): boolean {
    if (error instanceof Error) {
      return error.message.includes('duplicate key') ||
             error.message.includes('unique constraint');
    }
    return false;
  }
}
