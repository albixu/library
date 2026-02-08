/**
 * PostgresCategoryRepository Adapter
 *
 * Implements the CategoryRepository port using Drizzle ORM with PostgreSQL.
 * This is a driven/output adapter in the hexagonal architecture.
 */

import { eq, inArray } from 'drizzle-orm';
import { Category } from '../../../domain/entities/Category.js';
import { CategoryAlreadyExistsError } from '../../../domain/errors/DomainErrors.js';
import type { CategoryRepository } from '../../../application/ports/CategoryRepository.js';
import { categories, type CategorySelect } from './drizzle/schema.js';
import { CategoryMapper } from './mappers/CategoryMapper.js';
import { generateUUID } from '../../../shared/utils/uuid.js';

/**
 * Database type that supports our operations
 * This is a generic interface that works with any Drizzle PostgreSQL connection
 */
interface DrizzleDb {
  select: () => {
    from: (table: typeof categories) => {
      where: (condition: unknown) => Promise<CategorySelect[]>;
    };
  };
  insert: (table: typeof categories) => {
    values: (data: unknown) => {
      returning: () => Promise<CategorySelect[]>;
      onConflictDoNothing: () => {
        returning: () => Promise<CategorySelect[]>;
      };
    };
  };
  query: {
    categories: {
      findFirst: (options?: { where?: unknown }) => Promise<CategorySelect | null>;
      findMany: (options?: { where?: unknown }) => Promise<CategorySelect[]>;
    };
  };
}

/**
 * PostgresCategoryRepository
 *
 * Adapter that implements CategoryRepository using Drizzle ORM.
 * Provides CRUD operations for categories with case-insensitive name handling.
 */
export class PostgresCategoryRepository implements CategoryRepository {
  constructor(readonly db: DrizzleDb) {}

  /**
   * Finds a category by its unique identifier
   */
  async findById(id: string): Promise<Category | null> {
    const result = await this.db.query.categories.findFirst({
      where: eq(categories.id, id),
    });

    return result ? CategoryMapper.toDomain(result) : null;
  }

  /**
   * Finds a category by its name (case-insensitive)
   */
  async findByName(name: string): Promise<Category | null> {
    const normalizedName = name.trim().toLowerCase();
    
    const result = await this.db.query.categories.findFirst({
      where: eq(categories.name, normalizedName),
    });

    return result ? CategoryMapper.toDomain(result) : null;
  }

  /**
   * Finds multiple categories by their names (case-insensitive)
   */
  async findByNames(names: string[]): Promise<Category[]> {
    if (names.length === 0) {
      return [];
    }

    const normalizedNames = names.map((n) => n.trim().toLowerCase());
    
    const results = await this.db.query.categories.findMany({
      where: inArray(categories.name, normalizedNames),
    });

    return CategoryMapper.toDomainList(results);
  }

  /**
   * Finds a category by name or creates it if it doesn't exist
   */
  async findOrCreate(name: string): Promise<Category> {
    const existing = await this.findByName(name);
    
    if (existing) {
      return existing;
    }

    // Create new category
    const newCategory = Category.create({
      id: generateUUID(),
      name: name,
    });

    return this.save(newCategory);
  }

  /**
   * Finds or creates multiple categories by their names
   * Returns categories in the same order as input names
   */
  async findOrCreateMany(names: string[]): Promise<Category[]> {
    if (names.length === 0) {
      return [];
    }

    const normalizedNames = names.map((n) => n.trim().toLowerCase());
    
    // Find existing categories
    const existingCategories = await this.findByNames(normalizedNames);
    const existingNamesSet = new Set(existingCategories.map((c) => c.name));

    // Determine which categories need to be created
    const namesToCreate = normalizedNames.filter((n) => !existingNamesSet.has(n));

    // Create new categories if any
    if (namesToCreate.length > 0) {
      const categoriesToInsert = namesToCreate.map((name) =>
        Category.create({
          id: generateUUID(),
          name,
        })
      );

      const insertRecords = CategoryMapper.toPersistenceList(categoriesToInsert);
      
      // Insert with onConflictDoNothing - some may be skipped by concurrent writers
      await this.db
        .insert(categories)
        .values(insertRecords)
        .onConflictDoNothing()
        .returning();
    }

    // Re-fetch all categories to ensure we have complete data
    // This handles race conditions where concurrent writers inserted categories
    // between our initial check and our insert attempt
    const allCategories = await this.findByNames(normalizedNames);
    const categoryMap = new Map(allCategories.map((c) => [c.name, c]));

    // Return in input order, filtering out any undefined values
    return normalizedNames
      .map((name) => categoryMap.get(name))
      .filter((category): category is Category => category !== undefined);
  }

  /**
   * Saves a new category to the database
   */
  async save(category: Category): Promise<Category> {
    const record = CategoryMapper.toPersistence(category);

    try {
      const result = await this.db
        .insert(categories)
        .values(record)
        .returning();

      const inserted = result[0];
      if (!inserted) {
        throw new Error('Failed to insert category - no record returned');
      }

      return CategoryMapper.toDomain(inserted);
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        throw new CategoryAlreadyExistsError(category.name);
      }
      throw error;
    }
  }

  /**
   * Saves multiple categories to the database
   */
  async saveMany(categoriesToSave: Category[]): Promise<void> {
    if (categoriesToSave.length === 0) {
      return;
    }

    const records = CategoryMapper.toPersistenceList(categoriesToSave);

    try {
      await this.db
        .insert(categories)
        .values(records)
        .returning();
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        // We can't easily determine which category caused the conflict
        throw new CategoryAlreadyExistsError('one or more categories');
      }
      throw error;
    }
  }

  /**
   * Retrieves all categories
   */
  async findAll(): Promise<Category[]> {
    const results = await this.db.query.categories.findMany();
    return CategoryMapper.toDomainList(results);
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
