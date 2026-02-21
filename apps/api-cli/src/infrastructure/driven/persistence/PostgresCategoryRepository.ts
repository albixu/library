/**
 * PostgresCategoryRepository Adapter
 *
 * Implements the CategoryRepository port using Drizzle ORM with PostgreSQL.
 * This is a driven/output adapter in the hexagonal architecture.
 *
 * HU-008: Updated to support type-scoped category operations.
 * Categories are now unique within a type, not globally.
 */

import { eq, inArray, count, and, asc } from 'drizzle-orm';
import { Category } from '../../../domain/entities/Category.js';
import { CategoryAlreadyExistsError } from '../../../domain/errors/DomainErrors.js';
import type { CategoryRepository } from '../../../application/ports/CategoryRepository.js';
import { categories } from './drizzle/schema.js';
import { CategoryMapper } from './mappers/CategoryMapper.js';
import { generateUUID } from '../../../shared/utils/uuid.js';
import { isDuplicateKeyError } from './utils.js';
import type { DatabaseClient } from './types.js';

/**
 * PostgresCategoryRepository
 *
 * Adapter that implements CategoryRepository using Drizzle ORM.
 * Provides CRUD operations for categories with case-insensitive name handling.
 */
export class PostgresCategoryRepository implements CategoryRepository {
  constructor(readonly db: DatabaseClient) {}

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
   * Note: This returns the first match globally. Use findByNameAndTypeId for type-scoped search.
   */
  async findByName(name: string): Promise<Category | null> {
    const normalizedName = name.trim().toLowerCase();
    
    const result = await this.db.query.categories.findFirst({
      where: eq(categories.name, normalizedName),
    });

    return result ? CategoryMapper.toDomain(result) : null;
  }

  /**
   * Finds a category by its name and type (case-insensitive)
   * HU-008: Categories are unique within a type, not globally.
   */
  async findByNameAndTypeId(name: string, typeId: string): Promise<Category | null> {
    const normalizedName = name.trim().toLowerCase();
    
    const result = await this.db.query.categories.findFirst({
      where: and(
        eq(categories.name, normalizedName),
        eq(categories.typeId, typeId),
      ),
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
   * Finds all categories belonging to a specific type
   * HU-008: Categories now belong to exactly one type.
   */
  async findByTypeId(typeId: string): Promise<Category[]> {
    const results = await this.db.query.categories.findMany({
      where: eq(categories.typeId, typeId),
    });

    return CategoryMapper.toDomainList(results);
  }

  /**
   * Finds a category by name and type or creates it if it doesn't exist
   * HU-008: Now requires typeId since categories are scoped to types.
   */
  async findOrCreate(name: string, typeId: string): Promise<Category> {
    const existing = await this.findByNameAndTypeId(name, typeId);
    
    if (existing) {
      return existing;
    }

    // Create new category with typeId
    const newCategory = Category.create({
      id: generateUUID(),
      name: name,
      typeId: typeId,
    });

    try {
      return await this.save(newCategory);
    } catch (error) {
      // Handle concurrent creation: if another process created the category
      // in between our check and save, return the existing one instead of
      // propagating a CategoryAlreadyExistsError.
      if (error instanceof CategoryAlreadyExistsError) {
        const concurrentExisting = await this.findByNameAndTypeId(name, typeId);
        if (concurrentExisting) {
          return concurrentExisting;
        }
      }
      throw error;
    }
  }

  /**
   * Finds or creates multiple categories by their names
   * HU-008: Now requires typeId since categories are scoped to types.
   * Returns categories in the same order as input names
   */
  async findOrCreateMany(names: string[], typeId: string): Promise<Category[]> {
    if (names.length === 0) {
      return [];
    }

    const normalizedNames = names.map((n) => n.trim().toLowerCase());
    
    // Find existing categories for this type
    const existingCategories = await this.db.query.categories.findMany({
      where: and(
        inArray(categories.name, normalizedNames),
        eq(categories.typeId, typeId),
      ),
    });
    const existingCategoriesDomain = CategoryMapper.toDomainList(existingCategories);
    const existingNamesSet = new Set(existingCategoriesDomain.map((c) => c.name));

    // Determine which categories need to be created
    const namesToCreate = normalizedNames.filter((n) => !existingNamesSet.has(n));

    // Create new categories if any
    if (namesToCreate.length > 0) {
      const categoriesToInsert = namesToCreate.map((name) =>
        Category.create({
          id: generateUUID(),
          name,
          typeId,
        }),
      );

      const insertRecords = CategoryMapper.toPersistenceList(categoriesToInsert);
      
      // Insert with onConflictDoNothing - some may be skipped by concurrent writers
      await this.db
        .insert(categories)
        .values(insertRecords)
        .onConflictDoNothing()
        .returning();
    }

    // Re-fetch all categories for this type to ensure we have complete data
    // This handles race conditions where concurrent writers inserted categories
    // between our initial check and our insert attempt
    const allCategories = await this.db.query.categories.findMany({
      where: and(
        inArray(categories.name, normalizedNames),
        eq(categories.typeId, typeId),
      ),
    });
    const allCategoriesDomain = CategoryMapper.toDomainList(allCategories);
    const categoryMap = new Map(allCategoriesDomain.map((c) => [c.name, c]));

    // Build result in input order and validate completeness
    const result: Category[] = [];
    for (const name of normalizedNames) {
      const category = categoryMap.get(name);
      if (!category) {
        const missingNames = normalizedNames.filter((n) => !categoryMap.has(n));
        throw new Error(
          `Failed to find or create the requested categories: ${missingNames.join(', ')}`,
        );
      }
      result.push(category);
    }

    return result;
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
      if (isDuplicateKeyError(error)) {
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
      if (isDuplicateKeyError(error)) {
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
   * Retrieves all categories sorted alphabetically by name (A-Z)
   * HU-009: Used for listing categories in the API response.
   */
  async findAllSorted(): Promise<Category[]> {
    const results = await this.db.query.categories.findMany({
      orderBy: asc(categories.name),
    });
    return CategoryMapper.toDomainList(results);
  }

  /**
   * Retrieves categories for a specific type, sorted alphabetically by name (A-Z)
   * HU-009: Used for listing categories filtered by type in the API response.
   */
  async findByTypeIdSorted(typeId: string): Promise<Category[]> {
    const results = await this.db.query.categories.findMany({
      where: eq(categories.typeId, typeId),
      orderBy: asc(categories.name),
    });
    return CategoryMapper.toDomainList(results);
  }

  /**
   * Counts the total number of categories
   */
  async count(): Promise<number> {
    const result = await this.db
      .select({ count: count() })
      .from(categories) as { count: number }[];
    return result[0]?.count ?? 0;
  }
}
