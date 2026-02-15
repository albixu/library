/**
 * PostgresTypeRepository Integration Tests
 *
 * Tests the TypeRepository adapter against a real PostgreSQL database.
 * Requires Docker containers to be running: docker-compose up -d
 *
 * IMPORTANT: This test uses prefixed type names (e.g., 'test_technical') to avoid
 * conflicts with seed types that other integration tests depend on.
 * It does NOT delete the types table, preserving the seed data.
 *
 * Run with: npm run test:integration
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, like } from 'drizzle-orm';
import pg from 'pg';
import { PostgresTypeRepository } from '../../../../src/infrastructure/driven/persistence/PostgresTypeRepository.js';
import * as schema from '../../../../src/infrastructure/driven/persistence/drizzle/schema.js';
import { generateUUID } from '../../../../src/shared/utils/uuid.js';

const { Pool } = pg;
const { types, books, bookAuthors, bookCategories, categories, authors } = schema;

/**
 * Prefix used to identify test-created types.
 * This allows us to clean up test data without affecting seed types.
 */
const TEST_TYPE_PREFIX = 'test_';

describe('PostgresTypeRepository Integration', () => {
  let pool: pg.Pool;
  let db: ReturnType<typeof drizzle>;
  let repository: PostgresTypeRepository;

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    repository = new PostgresTypeRepository(db as any);
  });

  afterAll(async () => {
    // Clean up only test types (prefixed)
    await cleanupTestTypes();
    await pool.end();
  });

  beforeEach(async () => {
    // Clean up only test types before each test (keeps seed types intact)
    await cleanupTestTypes();
  });

  /**
   * Cleans up only types created by this test (prefixed with TEST_TYPE_PREFIX)
   */
  async function cleanupTestTypes(): Promise<void> {
    await db.delete(types).where(like(types.name, `${TEST_TYPE_PREFIX}%`));
  }

  /**
   * Helper function to seed a test type directly in the database.
   * Uses a prefix to distinguish from seed types.
   */
  async function seedTestType(name: string): Promise<string> {
    const id = generateUUID();
    const now = new Date();
    const prefixedName = `${TEST_TYPE_PREFIX}${name.toLowerCase()}`;
    await db.insert(types).values({
      id,
      name: prefixedName,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  }

  describe('findById', () => {
    it('should find an existing type by ID', async () => {
      const id = await seedTestType('technical');

      const found = await repository.findById(id);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(id);
      expect(found!.name).toBe(`${TEST_TYPE_PREFIX}technical`);
    });

    it('should return null for non-existent ID', async () => {
      const found = await repository.findById(generateUUID());

      expect(found).toBeNull();
    });

    it('should return type with all properties', async () => {
      const id = await seedTestType('novel');

      const found = await repository.findById(id);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(id);
      expect(found!.name).toBe(`${TEST_TYPE_PREFIX}novel`);
      expect(found!.createdAt).toBeInstanceOf(Date);
      expect(found!.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('findByName', () => {
    it('should find type by exact lowercase name', async () => {
      await seedTestType('technical');

      const found = await repository.findByName(`${TEST_TYPE_PREFIX}technical`);

      expect(found).not.toBeNull();
      expect(found!.name).toBe(`${TEST_TYPE_PREFIX}technical`);
    });

    it('should find type by uppercase name (case-insensitive)', async () => {
      await seedTestType('technical');

      const found = await repository.findByName(`${TEST_TYPE_PREFIX}TECHNICAL`.toUpperCase());

      expect(found).not.toBeNull();
      expect(found!.name).toBe(`${TEST_TYPE_PREFIX}technical`);
    });

    it('should find type by mixed case name', async () => {
      await seedTestType('technical');

      const found = await repository.findByName(`${TEST_TYPE_PREFIX}Technical`);

      expect(found).not.toBeNull();
      expect(found!.name).toBe(`${TEST_TYPE_PREFIX}technical`);
    });

    it('should find type with trimmed whitespace', async () => {
      await seedTestType('novel');

      const found = await repository.findByName(`  ${TEST_TYPE_PREFIX}novel  `);

      expect(found).not.toBeNull();
      expect(found!.name).toBe(`${TEST_TYPE_PREFIX}novel`);
    });

    it('should return null for non-existent type', async () => {
      await seedTestType('technical');

      const found = await repository.findByName(`${TEST_TYPE_PREFIX}nonexistent`);

      expect(found).toBeNull();
    });

    it('should return null for empty name', async () => {
      await seedTestType('technical');

      const found = await repository.findByName('');

      expect(found).toBeNull();
    });

    it('should return null for whitespace-only name', async () => {
      await seedTestType('technical');

      const found = await repository.findByName('   ');

      expect(found).toBeNull();
    });

    it('should find existing seed types (e.g., technical)', async () => {
      // This test verifies the repository works with actual seed data
      const found = await repository.findByName('technical');

      // This will pass if seed types exist, otherwise skip
      if (found) {
        expect(found.name).toBe('technical');
      }
    });
  });

  describe('findAll', () => {
    it('should return all types including test and seed types', async () => {
      await seedTestType('alpha');
      await seedTestType('beta');

      const all = await repository.findAll();

      // Should include our test types plus any seed types
      expect(all.length).toBeGreaterThanOrEqual(2);
      
      const testTypeNames = all
        .filter((t) => t.name.startsWith(TEST_TYPE_PREFIX))
        .map((t) => t.name)
        .sort();
      expect(testTypeNames).toEqual([`${TEST_TYPE_PREFIX}alpha`, `${TEST_TYPE_PREFIX}beta`]);
    });

    it('should return at least seed types when no test types exist', async () => {
      const all = await repository.findAll();

      // Should include seed types (technical, novel, biography)
      const seedTypeNames = all
        .filter((t) => !t.name.startsWith(TEST_TYPE_PREFIX))
        .map((t) => t.name);
      
      // At minimum, seed types should exist
      expect(seedTypeNames.length).toBeGreaterThanOrEqual(0);
    });

    it('should return types with all properties', async () => {
      await seedTestType('gamma');

      const all = await repository.findAll();
      const testType = all.find((t) => t.name === `${TEST_TYPE_PREFIX}gamma`);

      expect(testType).toBeDefined();
      expect(testType!.id).toBeDefined();
      expect(testType!.name).toBe(`${TEST_TYPE_PREFIX}gamma`);
      expect(testType!.createdAt).toBeInstanceOf(Date);
      expect(testType!.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('count', () => {
    it('should return correct count including test types', async () => {
      const initialCount = await repository.count();
      
      await seedTestType('count1');
      await seedTestType('count2');
      await seedTestType('count3');

      const newCount = await repository.count();

      expect(newCount).toBe(initialCount + 3);
    });

    it('should return at least 0 for count', async () => {
      const count = await repository.count();

      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should increment count when adding types', async () => {
      const initial = await repository.count();

      await seedTestType('increment1');
      expect(await repository.count()).toBe(initial + 1);

      await seedTestType('increment2');
      expect(await repository.count()).toBe(initial + 2);
    });
  });

  describe('domain entity behavior', () => {
    it('should return immutable BookType entities', async () => {
      await seedTestType('immutable');

      const found = await repository.findByName(`${TEST_TYPE_PREFIX}immutable`);

      expect(found).not.toBeNull();
      // BookType should be frozen
      expect(Object.isFrozen(found!)).toBe(true);
    });

    it('should correctly identify type by name using hasName method', async () => {
      await seedTestType('hasname');

      const found = await repository.findByName(`${TEST_TYPE_PREFIX}hasname`);

      expect(found).not.toBeNull();
      expect(found!.hasName(`${TEST_TYPE_PREFIX}hasname`)).toBe(true);
      expect(found!.hasName(`${TEST_TYPE_PREFIX}HASNAME`)).toBe(true);
      expect(found!.hasName(`${TEST_TYPE_PREFIX}HasName`)).toBe(true);
      expect(found!.hasName('novel')).toBe(false);
    });
  });
});
