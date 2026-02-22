/**
 * PostgresCategoryRepository Integration Tests
 *
 * Tests the CategoryRepository adapter against a real PostgreSQL database.
 * Requires Docker containers to be running: docker-compose up -d
 *
 * Run with: npm run test:integration
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { PostgresCategoryRepository } from '../../../../src/infrastructure/driven/persistence/PostgresCategoryRepository.js';
import { PostgresTypeRepository } from '../../../../src/infrastructure/driven/persistence/PostgresTypeRepository.js';
import { Category } from '../../../../src/domain/entities/Category.js';
import { BookType } from '../../../../src/domain/entities/BookType.js';
import { CategoryAlreadyExistsError } from '../../../../src/domain/errors/DomainErrors.js';
import * as schema from '../../../../src/infrastructure/driven/persistence/drizzle/schema.js';
import { generateUUID } from '../../../../src/shared/utils/uuid.js';

const { Pool } = pg;
const { categories, books, bookCategories } = schema;

describe('PostgresCategoryRepository Integration', () => {
  let pool: pg.Pool;
  let db: ReturnType<typeof drizzle>;
  let repository: PostgresCategoryRepository;
  let typeRepository: PostgresTypeRepository;
  let testTypeId: string; // HU-008: Categories require a typeId

  beforeAll(async () => {
    const databaseUrl = process.env['DATABASE_URL'] ?? 'postgresql://library:library@localhost:5432/library';
    
    pool = new Pool({
      connectionString: databaseUrl,
      max: 5,
    });

    // Verify connection
    const client = await pool.connect();
    client.release();

    db = drizzle(pool, { schema });
     
    repository = new PostgresCategoryRepository(db as any);
    typeRepository = new PostgresTypeRepository(db as any);

    // HU-008: Get the 'technical' type ID for category tests
    const technicalType = await typeRepository.findByName('technical');
    if (!technicalType) {
      throw new Error('Type "technical" not found in database. Ensure seed data is loaded.');
    }
    testTypeId = technicalType.id;
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await db.delete(bookCategories);
    await db.delete(books);
    await db.delete(categories);
  });

  describe('save', () => {
    it('should save a new category', async () => {
      const category = Category.create({
        id: generateUUID(),
        name: 'Programming',
        typeId: testTypeId,
      });

      const saved = await repository.save(category);

      expect(saved.id).toBe(category.id);
      expect(saved.name).toBe('programming'); // Normalized to lowercase
      expect(saved.createdAt).toBeInstanceOf(Date);
      expect(saved.updatedAt).toBeInstanceOf(Date);
    });

    it('should throw CategoryAlreadyExistsError for duplicate name', async () => {
      const category1 = Category.create({
        id: generateUUID(),
        name: 'Duplicate',
        typeId: testTypeId,
      });

      await repository.save(category1);

      const category2 = Category.create({
        id: generateUUID(),
        name: 'DUPLICATE', // Same name, different case
        typeId: testTypeId,
      });

      await expect(repository.save(category2))
        .rejects
        .toThrow(CategoryAlreadyExistsError);
    });
  });

  describe('findById', () => {
    it('should find an existing category by ID', async () => {
      const category = Category.create({
        id: generateUUID(),
        name: 'findById Test',
        typeId: testTypeId,
      });
      await repository.save(category);

      const found = await repository.findById(category.id);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(category.id);
      expect(found!.name).toBe('findbyid test');
    });

    it('should return null for non-existent ID', async () => {
      const found = await repository.findById(generateUUID());
      expect(found).toBeNull();
    });
  });

  describe('findByName', () => {
    it('should find category by exact name (case-insensitive)', async () => {
      const category = Category.create({
        id: generateUUID(),
        name: 'Software Engineering',
        typeId: testTypeId,
      });
      await repository.save(category);

      // Search with different case
      const found = await repository.findByName('SOFTWARE ENGINEERING');

      expect(found).not.toBeNull();
      expect(found!.name).toBe('software engineering');
    });

    it('should return null for non-existent name', async () => {
      const found = await repository.findByName('Non-existent Category');
      expect(found).toBeNull();
    });
  });

  describe('findByNames', () => {
    it('should find multiple categories by names', async () => {
      // Create test categories
      await repository.save(Category.create({ id: generateUUID(), name: 'Category A', typeId: testTypeId }));
      await repository.save(Category.create({ id: generateUUID(), name: 'Category B', typeId: testTypeId }));
      await repository.save(Category.create({ id: generateUUID(), name: 'Category C', typeId: testTypeId }));

      const found = await repository.findByNames(['Category A', 'Category C']);

      expect(found).toHaveLength(2);
      const names = found.map((c) => c.name);
      expect(names).toContain('category a');
      expect(names).toContain('category c');
    });

    it('should return empty array for empty input', async () => {
      const found = await repository.findByNames([]);
      expect(found).toEqual([]);
    });

    it('should return only existing categories', async () => {
      await repository.save(Category.create({ id: generateUUID(), name: 'Exists', typeId: testTypeId }));

      const found = await repository.findByNames(['Exists', 'Does Not Exist']);

      expect(found).toHaveLength(1);
      expect(found[0]!.name).toBe('exists');
    });
  });

  describe('findOrCreate', () => {
    it('should return existing category if found', async () => {
      const existing = await repository.save(
        Category.create({ id: generateUUID(), name: 'Existing Category', typeId: testTypeId })
      );

      const result = await repository.findOrCreate('EXISTING CATEGORY', testTypeId);

      expect(result.id).toBe(existing.id);
      expect(result.name).toBe('existing category');
    });

    it('should create new category if not found', async () => {
      const result = await repository.findOrCreate('Brand New Category', testTypeId);

      expect(result.name).toBe('brand new category');
      expect(result.id).toBeDefined();

      // Verify it was persisted
      const verified = await repository.findByName('Brand New Category');
      expect(verified).not.toBeNull();
      expect(verified!.id).toBe(result.id);
    });
  });

  describe('findOrCreateMany', () => {
    it('should find existing and create new categories', async () => {
      // Create one existing category
      await repository.save(
        Category.create({ id: generateUUID(), name: 'Existing', typeId: testTypeId })
      );

      const result = await repository.findOrCreateMany(['Existing', 'New One', 'New Two'], testTypeId);

      expect(result).toHaveLength(3);
      expect(result[0]!.name).toBe('existing');
      expect(result[1]!.name).toBe('new one');
      expect(result[2]!.name).toBe('new two');
    });

    it('should maintain input order in results', async () => {
      await repository.save(Category.create({ id: generateUUID(), name: 'Zebra', typeId: testTypeId }));
      await repository.save(Category.create({ id: generateUUID(), name: 'Apple', typeId: testTypeId }));

      const result = await repository.findOrCreateMany(['Apple', 'Zebra', 'Mango'], testTypeId);

      expect(result[0]!.name).toBe('apple');
      expect(result[1]!.name).toBe('zebra');
      expect(result[2]!.name).toBe('mango');
    });

    it('should return empty array for empty input', async () => {
      const result = await repository.findOrCreateMany([], testTypeId);
      expect(result).toEqual([]);
    });

    it('should handle duplicates in input', async () => {
      const result = await repository.findOrCreateMany(['Same', 'Same', 'Same'], testTypeId);

      // Should return 3 items, all pointing to the same category
      expect(result).toHaveLength(3);
      expect(result[0]!.id).toBe(result[1]!.id);
      expect(result[1]!.id).toBe(result[2]!.id);
    });
  });

  describe('saveMany', () => {
    it('should save multiple categories at once', async () => {
      const categoriesToSave = [
        Category.create({ id: generateUUID(), name: 'Batch A', typeId: testTypeId }),
        Category.create({ id: generateUUID(), name: 'Batch B', typeId: testTypeId }),
        Category.create({ id: generateUUID(), name: 'Batch C', typeId: testTypeId }),
      ];

      await repository.saveMany(categoriesToSave);

      const all = await repository.findAll();
      expect(all).toHaveLength(3);
    });

    it('should throw error if any category is duplicate', async () => {
      await repository.save(
        Category.create({ id: generateUUID(), name: 'Already Exists', typeId: testTypeId })
      );

      const categoriesToSave = [
        Category.create({ id: generateUUID(), name: 'New Category', typeId: testTypeId }),
        Category.create({ id: generateUUID(), name: 'Already Exists', typeId: testTypeId }),
      ];

      await expect(repository.saveMany(categoriesToSave))
        .rejects
        .toThrow(CategoryAlreadyExistsError);
    });
  });

  describe('findAll', () => {
    it('should return all categories', async () => {
      await repository.save(Category.create({ id: generateUUID(), name: 'First', typeId: testTypeId }));
      await repository.save(Category.create({ id: generateUUID(), name: 'Second', typeId: testTypeId }));

      const all = await repository.findAll();

      expect(all).toHaveLength(2);
    });

    it('should return empty array when no categories exist', async () => {
      const all = await repository.findAll();
      expect(all).toEqual([]);
    });
  });

  describe('findAllSorted', () => {
    it('should return all categories sorted alphabetically by name (A-Z)', async () => {
      // Insert categories in non-alphabetical order
      await repository.save(Category.create({ id: generateUUID(), name: 'Zebra', typeId: testTypeId }));
      await repository.save(Category.create({ id: generateUUID(), name: 'Apple', typeId: testTypeId }));
      await repository.save(Category.create({ id: generateUUID(), name: 'Mango', typeId: testTypeId }));

      const all = await repository.findAllSorted();

      expect(all).toHaveLength(3);
      expect(all[0]!.name).toBe('apple');
      expect(all[1]!.name).toBe('mango');
      expect(all[2]!.name).toBe('zebra');
    });

    it('should return empty array when no categories exist', async () => {
      const all = await repository.findAllSorted();
      expect(all).toEqual([]);
    });

    it('should include categories from all types', async () => {
      // Get another type ID
      const novelType = await typeRepository.findByName('novel');
      if (!novelType) {
        throw new Error('Type "novel" not found in database. Ensure seed data is loaded.');
      }

      await repository.save(Category.create({ id: generateUUID(), name: 'Tech Category', typeId: testTypeId }));
      await repository.save(Category.create({ id: generateUUID(), name: 'Novel Category', typeId: novelType.id }));

      const all = await repository.findAllSorted();

      expect(all).toHaveLength(2);
      // Verify both types are included
      const typeIds = all.map((c) => c.typeId);
      expect(typeIds).toContain(testTypeId);
      expect(typeIds).toContain(novelType.id);
    });
  });

  describe('findByTypeIdSorted', () => {
    it('should return categories for a specific type sorted alphabetically', async () => {
      // Insert categories in non-alphabetical order
      await repository.save(Category.create({ id: generateUUID(), name: 'Zebra', typeId: testTypeId }));
      await repository.save(Category.create({ id: generateUUID(), name: 'Apple', typeId: testTypeId }));
      await repository.save(Category.create({ id: generateUUID(), name: 'Mango', typeId: testTypeId }));

      const result = await repository.findByTypeIdSorted(testTypeId);

      expect(result).toHaveLength(3);
      expect(result[0]!.name).toBe('apple');
      expect(result[1]!.name).toBe('mango');
      expect(result[2]!.name).toBe('zebra');
    });

    it('should return empty array when type has no categories', async () => {
      const result = await repository.findByTypeIdSorted(generateUUID());
      expect(result).toEqual([]);
    });

    it('should only return categories for the specified type', async () => {
      // Get another type ID
      const novelType = await typeRepository.findByName('novel');
      if (!novelType) {
        throw new Error('Type "novel" not found in database. Ensure seed data is loaded.');
      }

      await repository.save(Category.create({ id: generateUUID(), name: 'Tech Category', typeId: testTypeId }));
      await repository.save(Category.create({ id: generateUUID(), name: 'Novel Category', typeId: novelType.id }));

      const techCategories = await repository.findByTypeIdSorted(testTypeId);

      expect(techCategories).toHaveLength(1);
      expect(techCategories[0]!.name).toBe('tech category');
      expect(techCategories[0]!.typeId).toBe(testTypeId);
    });

    it('should return all categories for a type with multiple categories', async () => {
      await repository.save(Category.create({ id: generateUUID(), name: 'Best Practices', typeId: testTypeId }));
      await repository.save(Category.create({ id: generateUUID(), name: 'Architecture', typeId: testTypeId }));
      await repository.save(Category.create({ id: generateUUID(), name: 'Programming', typeId: testTypeId }));

      const result = await repository.findByTypeIdSorted(testTypeId);

      expect(result).toHaveLength(3);
      // Verify alphabetical order
      expect(result[0]!.name).toBe('architecture');
      expect(result[1]!.name).toBe('best practices');
      expect(result[2]!.name).toBe('programming');
    });
  });
});
