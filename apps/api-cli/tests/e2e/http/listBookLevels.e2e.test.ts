/**
 * E2E Tests: GET /api/book-levels
 *
 * End-to-end tests for the book levels listing API endpoint.
 * These tests validate the complete flow from HTTP request to database query.
 *
 * Tests cover:
 * - Successful listing without filter (200)
 * - Successful listing with type filter (200)
 * - Empty result for non-existent type filter (200)
 * - Case-insensitive type filter
 * - Alphabetical sorting verification
 * - Response format verification (id, name only)
 *
 * Part of HU-010: List Book Levels Endpoint
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createE2EContext, E2E_BASE_URL } from '../setup.js';
import { randomUUID } from 'crypto';
import * as schema from '../../../src/infrastructure/driven/persistence/drizzle/schema.js';

describe('GET /api/book-levels (E2E)', () => {
  const context = createE2EContext();

  // Test data - we'll store the type IDs to use in tests
  let technicalTypeId: string;
  let novelTypeId: string;

  // Sample level IDs for tests
  let advancedLevelId: string;
  let beginnerLevelId: string;
  let intermediateLevelId: string;

  beforeAll(async () => {
    await context.setup();

    const db = context.getDb();

    // Get the technical and novel type IDs from seeded data
    const technicalType = await db
      .select()
      .from(schema.types)
      .where(
        (await import('drizzle-orm')).eq(schema.types.name, 'technical'),
      )
      .limit(1);

    const novelType = await db
      .select()
      .from(schema.types)
      .where((await import('drizzle-orm')).eq(schema.types.name, 'novel'))
      .limit(1);

    technicalTypeId = technicalType[0]!.id;
    novelTypeId = novelType[0]!.id;
  });

  afterAll(async () => {
    await context.teardown();
  });

  beforeEach(async () => {
    // Clean levels and type_levels before each test
    const db = context.getDb();
    await db.delete(schema.typeLevels);
    await db.delete(schema.levels);
  });

  describe('Successful Listing without Filter', () => {
    it('should return 200 with standardized success response', async () => {
      const response = await fetch(`${E2E_BASE_URL}/api/book-levels`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      expect(response.status).toBe(200);

      const body = await response.json();

      // Verify standardized API response structure
      expect(body).toHaveProperty('success', true);
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('error', null);

      // Data should be an array
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('should return empty array when no levels exist', async () => {
      const response = await fetch(`${E2E_BASE_URL}/api/book-levels`);

      expect(response.status).toBe(200);

      const body = await response.json();

      expect(body.success).toBe(true);
      expect(body.data).toEqual([]);
    });

    it('should return all levels from database', async () => {
      // Insert test levels
      const db = context.getDb();
      advancedLevelId = randomUUID();
      beginnerLevelId = randomUUID();
      intermediateLevelId = randomUUID();

      await db.insert(schema.levels).values([
        { id: advancedLevelId, name: 'advanced' },
        { id: beginnerLevelId, name: 'beginner' },
        { id: intermediateLevelId, name: 'intermediate' },
      ]);

      const response = await fetch(`${E2E_BASE_URL}/api/book-levels`);

      expect(response.status).toBe(200);

      const body = await response.json();

      expect(body.data.length).toBe(3);

      // Each item should have only id and name fields
      body.data.forEach((item: Record<string, unknown>) => {
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('name');
        expect(typeof item['id']).toBe('string');
        expect(typeof item['name']).toBe('string');
      });
    });

    it('should return levels sorted alphabetically by name', async () => {
      // Insert test levels in non-alphabetical order
      const db = context.getDb();
      await db.insert(schema.levels).values([
        { id: randomUUID(), name: 'zebra level' },
        { id: randomUUID(), name: 'apple level' },
        { id: randomUUID(), name: 'middle level' },
      ]);

      const response = await fetch(`${E2E_BASE_URL}/api/book-levels`);

      expect(response.status).toBe(200);

      const body = await response.json();

      // Verify alphabetical sorting
      const names = body.data.map((item: { name: string }) => item.name);
      const sortedNames = [...names].sort((a, b) => a.localeCompare(b));

      expect(names).toEqual(sortedNames);
      expect(names).toEqual(['apple level', 'middle level', 'zebra level']);
    });

    it('should return only id and name fields (no createdAt/updatedAt)', async () => {
      const db = context.getDb();
      await db.insert(schema.levels).values({
        id: randomUUID(),
        name: 'test level',
      });

      const response = await fetch(`${E2E_BASE_URL}/api/book-levels`);

      expect(response.status).toBe(200);

      const body = await response.json();

      // Verify each item has only expected fields
      body.data.forEach((item: Record<string, unknown>) => {
        expect(Object.keys(item).sort()).toEqual(['id', 'name']);
        expect(item).not.toHaveProperty('createdAt');
        expect(item).not.toHaveProperty('updatedAt');
      });
    });

    it('should return valid UUID format for ids', async () => {
      const db = context.getDb();
      await db.insert(schema.levels).values({
        id: randomUUID(),
        name: 'uuid test level',
      });

      const response = await fetch(`${E2E_BASE_URL}/api/book-levels`);

      expect(response.status).toBe(200);

      const body = await response.json();
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      body.data.forEach((item: { id: string }) => {
        expect(item.id).toMatch(uuidRegex);
      });
    });
  });

  describe('Filtering by Type', () => {
    beforeEach(async () => {
      // Insert levels and associate with types via type_levels
      const db = context.getDb();

      advancedLevelId = randomUUID();
      beginnerLevelId = randomUUID();
      intermediateLevelId = randomUUID();

      await db.insert(schema.levels).values([
        { id: advancedLevelId, name: 'advanced' },
        { id: beginnerLevelId, name: 'beginner' },
        { id: intermediateLevelId, name: 'intermediate' },
      ]);

      // Associate levels with types via type_levels junction table
      // Technical type gets: advanced, beginner, intermediate
      // Novel type gets: beginner only
      await db.insert(schema.typeLevels).values([
        { typeId: technicalTypeId, levelId: advancedLevelId },
        { typeId: technicalTypeId, levelId: beginnerLevelId },
        { typeId: technicalTypeId, levelId: intermediateLevelId },
        { typeId: novelTypeId, levelId: beginnerLevelId },
      ]);
    });

    it('should filter levels by type name', async () => {
      const response = await fetch(
        `${E2E_BASE_URL}/api/book-levels?type=technical`,
      );

      expect(response.status).toBe(200);

      const body = await response.json();

      expect(body.success).toBe(true);
      expect(body.data.length).toBe(3);

      const names = body.data.map((item: { name: string }) => item.name);
      expect(names).toContain('advanced');
      expect(names).toContain('beginner');
      expect(names).toContain('intermediate');
    });

    it('should filter levels by novel type', async () => {
      const response = await fetch(`${E2E_BASE_URL}/api/book-levels?type=novel`);

      expect(response.status).toBe(200);

      const body = await response.json();

      expect(body.success).toBe(true);
      expect(body.data.length).toBe(1);
      expect(body.data[0].name).toBe('beginner');
    });

    it('should be case-insensitive for type filter (AC3)', async () => {
      // Test uppercase
      const responseUpper = await fetch(
        `${E2E_BASE_URL}/api/book-levels?type=TECHNICAL`,
      );
      expect(responseUpper.status).toBe(200);
      const bodyUpper = await responseUpper.json();
      expect(bodyUpper.data.length).toBe(3);

      // Test mixed case
      const responseMixed = await fetch(
        `${E2E_BASE_URL}/api/book-levels?type=Technical`,
      );
      expect(responseMixed.status).toBe(200);
      const bodyMixed = await responseMixed.json();
      expect(bodyMixed.data.length).toBe(3);
    });

    it('should return empty array for non-existent type (AC4)', async () => {
      const response = await fetch(
        `${E2E_BASE_URL}/api/book-levels?type=nonexistent`,
      );

      expect(response.status).toBe(200);

      const body = await response.json();

      expect(body.success).toBe(true);
      expect(body.data).toEqual([]);
      expect(body.error).toBeNull();
    });

    it('should still sort results alphabetically when filtered (AC1)', async () => {
      const response = await fetch(
        `${E2E_BASE_URL}/api/book-levels?type=technical`,
      );

      expect(response.status).toBe(200);

      const body = await response.json();

      const names = body.data.map((item: { name: string }) => item.name);
      // Should be sorted: advanced, beginner, intermediate
      expect(names).toEqual(['advanced', 'beginner', 'intermediate']);
    });

    it('should only return levels associated with the specified type', async () => {
      // Add a level NOT associated with any type
      const db = context.getDb();
      const unassociatedLevelId = randomUUID();
      await db.insert(schema.levels).values({
        id: unassociatedLevelId,
        name: 'unassociated',
      });

      const response = await fetch(
        `${E2E_BASE_URL}/api/book-levels?type=technical`,
      );

      expect(response.status).toBe(200);

      const body = await response.json();

      const names = body.data.map((item: { name: string }) => item.name);
      expect(names).not.toContain('unassociated');
    });
  });

  describe('Response Headers', () => {
    it('should return JSON content type', async () => {
      const response = await fetch(`${E2E_BASE_URL}/api/book-levels`);

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('application/json');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty type parameter gracefully', async () => {
      // Insert a level
      const db = context.getDb();
      await db.insert(schema.levels).values({
        id: randomUUID(),
        name: 'test level',
      });

      // Empty type parameter should return all levels
      const response = await fetch(`${E2E_BASE_URL}/api/book-levels?type=`);

      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.success).toBe(true);
      // Empty string should be treated as no filter
      expect(body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle special characters in type parameter', async () => {
      const response = await fetch(
        `${E2E_BASE_URL}/api/book-levels?type=test%20type`,
      );

      expect(response.status).toBe(200);

      const body = await response.json();

      // Should return empty array (type doesn't exist)
      expect(body.success).toBe(true);
      expect(body.data).toEqual([]);
    });

    it('should handle level associated with multiple types', async () => {
      const db = context.getDb();
      const sharedLevelId = randomUUID();

      await db.insert(schema.levels).values({
        id: sharedLevelId,
        name: 'shared level',
      });

      // Associate with both types
      await db.insert(schema.typeLevels).values([
        { typeId: technicalTypeId, levelId: sharedLevelId },
        { typeId: novelTypeId, levelId: sharedLevelId },
      ]);

      // Should appear in both type queries
      const technicalResponse = await fetch(
        `${E2E_BASE_URL}/api/book-levels?type=technical`,
      );
      const technicalBody = await technicalResponse.json();
      expect(
        technicalBody.data.some((l: { name: string }) => l.name === 'shared level'),
      ).toBe(true);

      const novelResponse = await fetch(
        `${E2E_BASE_URL}/api/book-levels?type=novel`,
      );
      const novelBody = await novelResponse.json();
      expect(
        novelBody.data.some((l: { name: string }) => l.name === 'shared level'),
      ).toBe(true);
    });

    it('should return type with no associated levels as empty array', async () => {
      // Technical type exists but has no levels associated
      const response = await fetch(
        `${E2E_BASE_URL}/api/book-levels?type=technical`,
      );

      expect(response.status).toBe(200);

      const body = await response.json();

      expect(body.success).toBe(true);
      expect(body.data).toEqual([]);
    });
  });

  describe('Standardized Response Format (AC6)', () => {
    it('should have success, data, and error fields in response', async () => {
      const response = await fetch(`${E2E_BASE_URL}/api/book-levels`);

      const body = await response.json();

      expect(body).toHaveProperty('success');
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('error');
    });

    it('should return success=true and error=null for successful requests', async () => {
      const db = context.getDb();
      await db.insert(schema.levels).values({
        id: randomUUID(),
        name: 'test level',
      });

      const response = await fetch(`${E2E_BASE_URL}/api/book-levels`);

      const body = await response.json();

      expect(body.success).toBe(true);
      expect(body.error).toBeNull();
    });
  });
});
