/**
 * PostgresTypeRepository
 *
 * PostgreSQL implementation of the TypeRepository port using Drizzle ORM.
 *
 * This repository provides read-only access to book types stored in the database.
 * Types are seeded at database initialization and should not be created/updated
 * through the application layer.
 *
 * Part of TASK-008 for HU-002 (Initial Data Load)
 */

import { eq, count } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { TypeRepository } from '../../../application/ports/TypeRepository.js';
import { BookType } from '../../../domain/entities/BookType.js';
import { types } from './drizzle/schema.js';
import { TypeMapper } from './mappers/TypeMapper.js';
import * as schema from './drizzle/schema.js';

/**
 * PostgreSQL implementation of TypeRepository
 */
export class PostgresTypeRepository implements TypeRepository {
  constructor(public readonly db: PostgresJsDatabase<typeof schema>) {}

  /**
   * Finds a book type by its unique identifier
   *
   * @param id - The type UUID
   * @returns Promise resolving to the BookType if found, null otherwise
   */
  async findById(id: string): Promise<BookType | null> {
    const result = await this.db.query.types.findFirst({
      where: (types, { eq }) => eq(types.id, id),
    });

    if (!result) {
      return null;
    }

    return TypeMapper.toDomain(result);
  }

  /**
   * Finds a book type by its name (case-insensitive)
   *
   * Type names are stored in lowercase, so we normalize the input
   * for case-insensitive matching.
   *
   * @param name - The type name to search for
   * @returns Promise resolving to the BookType if found, null otherwise
   */
  async findByName(name: string): Promise<BookType | null> {
    const trimmedName = name.trim();

    // Early return for empty names
    if (!trimmedName) {
      return null;
    }

    // Normalize to lowercase for case-insensitive search
    const normalizedName = trimmedName.toLowerCase();

    const result = await this.db.query.types.findFirst({
      where: (types, { eq }) => eq(types.name, normalizedName),
    });

    if (!result) {
      return null;
    }

    return TypeMapper.toDomain(result);
  }

  /**
   * Retrieves all book types
   *
   * @returns Promise resolving to an array of all BookTypes
   */
  async findAll(): Promise<BookType[]> {
    const results = await this.db.query.types.findMany();
    return TypeMapper.toDomainList(results);
  }

  /**
   * Counts the total number of book types
   *
   * @returns Promise resolving to the total count
   */
  async count(): Promise<number> {
    const result = await this.db.select({ count: count() }).from(types);
    return Number(result[0]?.count ?? 0);
  }
}
