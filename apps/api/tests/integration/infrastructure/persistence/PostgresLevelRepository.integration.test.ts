/**
 * PostgresLevelRepository Integration Tests
 *
 * Tests the LevelRepository adapter against a real PostgreSQL database.
 * Requires Docker containers to be running: docker-compose up -d
 *
 * Run with: npm run test:integration
 *
 * HU-010: Tests for findAllSorted and findByTypeIdSorted methods.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { PostgresLevelRepository } from '../../../../src/infrastructure/driven/persistence/PostgresLevelRepository.js';
import { PostgresTypeRepository } from '../../../../src/infrastructure/driven/persistence/PostgresTypeRepository.js';
import { Level } from '../../../../src/domain/entities/Level.js';
import * as schema from '../../../../src/infrastructure/driven/persistence/drizzle/schema.js';
import { generateUUID } from '../../../../src/shared/utils/uuid.js';

const { Pool } = pg;
const { levels, typeLevels } = schema;

describe('PostgresLevelRepository Integration', () => {
  let pool: pg.Pool;
  let db: ReturnType<typeof drizzle>;
  let repository: PostgresLevelRepository;
  let typeRepository: PostgresTypeRepository;
  let technicalTypeId: string;
  let novelTypeId: string;

  beforeAll(async () => {
    const databaseUrl =
      process.env['DATABASE_URL'] ??
      'postgresql://library:library@localhost:5432/library';

    pool = new Pool({
      connectionString: databaseUrl,
      max: 5,
    });

    // Verify connection
    const client = await pool.connect();
    client.release();

    db = drizzle(pool, { schema });

    repository = new PostgresLevelRepository(db as PostgresLevelRepository['db']);
    typeRepository = new PostgresTypeRepository(db as PostgresTypeRepository['db']);

    // Get type IDs for tests
    const technicalType = await typeRepository.findByName('technical');
    if (!technicalType) {
      throw new Error(
        'Type "technical" not found in database. Ensure seed data is loaded.',
      );
    }
    technicalTypeId = technicalType.id;

    const novelType = await typeRepository.findByName('novel');
    if (!novelType) {
      throw new Error(
        'Type "novel" not found in database. Ensure seed data is loaded.',
      );
    }
    novelTypeId = novelType.id;
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    // First remove type-level associations, then levels
    await db.delete(typeLevels);
    await db.delete(levels);
  });

  describe('findAllSorted', () => {
    it('should return all levels sorted alphabetically by name (A-Z)', async () => {
      // Insert levels in non-alphabetical order
      const levelZ = Level.create({ id: generateUUID(), name: 'Zebra Level' });
      const levelA = Level.create({ id: generateUUID(), name: 'Apple Level' });
      const levelM = Level.create({ id: generateUUID(), name: 'Mango Level' });

      await repository.save(levelZ);
      await repository.save(levelA);
      await repository.save(levelM);

      const result = await repository.findAllSorted();

      expect(result).toHaveLength(3);
      expect(result[0]!.name).toBe('Apple Level');
      expect(result[1]!.name).toBe('Mango Level');
      expect(result[2]!.name).toBe('Zebra Level');
    });

    it('should return empty array when no levels exist', async () => {
      const result = await repository.findAllSorted();
      expect(result).toEqual([]);
    });

    it('should return levels with all properties', async () => {
      const level = Level.create({ id: generateUUID(), name: 'Test Level' });
      await repository.save(level);

      const result = await repository.findAllSorted();

      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe(level.id);
      expect(result[0]!.name).toBe('Test Level');
      expect(result[0]!.createdAt).toBeInstanceOf(Date);
      expect(result[0]!.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('findByTypeIdSorted', () => {
    it('should return levels associated with a type sorted alphabetically', async () => {
      // Create levels
      const levelZ = Level.create({ id: generateUUID(), name: 'Zebra' });
      const levelA = Level.create({ id: generateUUID(), name: 'Apple' });
      const levelM = Level.create({ id: generateUUID(), name: 'Mango' });

      await repository.save(levelZ);
      await repository.save(levelA);
      await repository.save(levelM);

      // Associate with technical type
      await repository.addToType(levelZ.id, technicalTypeId);
      await repository.addToType(levelA.id, technicalTypeId);
      await repository.addToType(levelM.id, technicalTypeId);

      const result = await repository.findByTypeIdSorted(technicalTypeId);

      expect(result).toHaveLength(3);
      expect(result[0]!.name).toBe('Apple');
      expect(result[1]!.name).toBe('Mango');
      expect(result[2]!.name).toBe('Zebra');
    });

    it('should return empty array when type has no associated levels', async () => {
      // Create a level but don't associate it with any type
      const level = Level.create({ id: generateUUID(), name: 'Orphan Level' });
      await repository.save(level);

      const result = await repository.findByTypeIdSorted(technicalTypeId);

      expect(result).toEqual([]);
    });

    it('should only return levels associated with the specified type', async () => {
      // Create levels for different types
      const techLevel = Level.create({
        id: generateUUID(),
        name: 'Tech Level',
      });
      const novelLevel = Level.create({
        id: generateUUID(),
        name: 'Novel Level',
      });

      await repository.save(techLevel);
      await repository.save(novelLevel);

      // Associate levels with their respective types
      await repository.addToType(techLevel.id, technicalTypeId);
      await repository.addToType(novelLevel.id, novelTypeId);

      const techResults = await repository.findByTypeIdSorted(technicalTypeId);
      const novelResults = await repository.findByTypeIdSorted(novelTypeId);

      expect(techResults).toHaveLength(1);
      expect(techResults[0]!.name).toBe('Tech Level');

      expect(novelResults).toHaveLength(1);
      expect(novelResults[0]!.name).toBe('Novel Level');
    });

    it('should return empty array for non-existent type ID', async () => {
      const result = await repository.findByTypeIdSorted(generateUUID());
      expect(result).toEqual([]);
    });

    it('should handle levels associated with multiple types', async () => {
      // Create a level associated with both types
      const sharedLevel = Level.create({
        id: generateUUID(),
        name: 'Shared Level',
      });
      await repository.save(sharedLevel);

      await repository.addToType(sharedLevel.id, technicalTypeId);
      await repository.addToType(sharedLevel.id, novelTypeId);

      const techResults = await repository.findByTypeIdSorted(technicalTypeId);
      const novelResults = await repository.findByTypeIdSorted(novelTypeId);

      // Both types should include the shared level
      expect(techResults).toHaveLength(1);
      expect(techResults[0]!.name).toBe('Shared Level');

      expect(novelResults).toHaveLength(1);
      expect(novelResults[0]!.name).toBe('Shared Level');
    });
  });
});
