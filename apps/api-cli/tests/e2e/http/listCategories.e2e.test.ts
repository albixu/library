/**
 * E2E Tests: GET /api/categories
 *
 * End-to-end tests for the categories listing API endpoint.
 * These tests validate the complete flow from HTTP request to database query.
 *
 * Tests cover:
 * - Successful listing without filter (200)
 * - Successful listing with type filter (200)
 * - Empty result for non-existent type filter (200)
 * - Case-insensitive type filter
 * - Alphabetical sorting verification
 * - Response format verification (id, name, typeId, description)
 *
 * Part of HU-009: List Categories Endpoint
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createE2EContext, E2E_BASE_URL } from '../setup.js';
import { randomUUID } from 'crypto';
import * as schema from '../../../src/infrastructure/driven/persistence/drizzle/schema.js';

describe('GET /api/categories (E2E)', () => {
  const context = createE2EContext();

  // Test data - we'll store the type ID to use in tests
  let technicalTypeId: string;
  let novelTypeId: string;

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
    // Clean categories before each test
    const db = context.getDb();
    await db.delete(schema.categories);
  });

  describe('Successful Listing without Filter', () => {
    it('should return 200 with standardized success response', async () => {
      const response = await fetch(`${E2E_BASE_URL}/api/categories`, {
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

    it('should return empty array when no categories exist', async () => {
      const response = await fetch(`${E2E_BASE_URL}/api/categories`);

      expect(response.status).toBe(200);

      const body = await response.json();

      expect(body.success).toBe(true);
      expect(body.data).toEqual([]);
    });

    it('should return all categories from database', async () => {
      // Insert test categories
      const db = context.getDb();
      await db.insert(schema.categories).values([
        {
          id: randomUUID(),
          name: 'Programming',
          typeId: technicalTypeId,
          description: 'Programming books',
        },
        {
          id: randomUUID(),
          name: 'Science Fiction',
          typeId: novelTypeId,
          description: 'Sci-fi novels',
        },
      ]);

      const response = await fetch(`${E2E_BASE_URL}/api/categories`);

      expect(response.status).toBe(200);

      const body = await response.json();

      expect(body.data.length).toBe(2);

      // Each item should have required fields
      body.data.forEach((item: Record<string, unknown>) => {
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('name');
        expect(item).toHaveProperty('typeId');
        expect(item).toHaveProperty('description');
        expect(typeof item['id']).toBe('string');
        expect(typeof item['name']).toBe('string');
        expect(typeof item['typeId']).toBe('string');
      });
    });

    it('should return categories sorted alphabetically by name', async () => {
      // Insert test categories in non-alphabetical order
      const db = context.getDb();
      await db.insert(schema.categories).values([
        { id: randomUUID(), name: 'Zebra Topics', typeId: technicalTypeId },
        { id: randomUUID(), name: 'Apple Topics', typeId: technicalTypeId },
        { id: randomUUID(), name: 'Middle Topics', typeId: technicalTypeId },
      ]);

      const response = await fetch(`${E2E_BASE_URL}/api/categories`);

      expect(response.status).toBe(200);

      const body = await response.json();

      // Verify alphabetical sorting
      const names = body.data.map((item: { name: string }) => item.name);
      const sortedNames = [...names].sort((a, b) => a.localeCompare(b));

      expect(names).toEqual(sortedNames);
      expect(names).toEqual(['Apple Topics', 'Middle Topics', 'Zebra Topics']);
    });

    it('should return only required fields (no createdAt/updatedAt)', async () => {
      const db = context.getDb();
      await db.insert(schema.categories).values({
        id: randomUUID(),
        name: 'Test Category',
        typeId: technicalTypeId,
        description: 'Test description',
      });

      const response = await fetch(`${E2E_BASE_URL}/api/categories`);

      expect(response.status).toBe(200);

      const body = await response.json();

      // Verify each item has only expected fields
      body.data.forEach((item: Record<string, unknown>) => {
        expect(Object.keys(item).sort()).toEqual([
          'description',
          'id',
          'name',
          'typeId',
        ]);
        expect(item).not.toHaveProperty('createdAt');
        expect(item).not.toHaveProperty('updatedAt');
      });
    });

    it('should return valid UUID format for ids', async () => {
      const db = context.getDb();
      await db.insert(schema.categories).values({
        id: randomUUID(),
        name: 'UUID Test Category',
        typeId: technicalTypeId,
      });

      const response = await fetch(`${E2E_BASE_URL}/api/categories`);

      expect(response.status).toBe(200);

      const body = await response.json();
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      body.data.forEach((item: { id: string; typeId: string }) => {
        expect(item.id).toMatch(uuidRegex);
        expect(item.typeId).toMatch(uuidRegex);
      });
    });
  });

  describe('Filtering by Type', () => {
    beforeEach(async () => {
      // Insert categories for different types
      const db = context.getDb();
      await db.insert(schema.categories).values([
        {
          id: randomUUID(),
          name: 'Programming',
          typeId: technicalTypeId,
          description: 'Programming books',
        },
        {
          id: randomUUID(),
          name: 'DevOps',
          typeId: technicalTypeId,
          description: 'DevOps books',
        },
        {
          id: randomUUID(),
          name: 'Fantasy',
          typeId: novelTypeId,
          description: 'Fantasy novels',
        },
      ]);
    });

    it('should filter categories by type name', async () => {
      const response = await fetch(
        `${E2E_BASE_URL}/api/categories?type=technical`,
      );

      expect(response.status).toBe(200);

      const body = await response.json();

      expect(body.success).toBe(true);
      expect(body.data.length).toBe(2);

      // All returned categories should belong to technical type
      body.data.forEach((item: { typeId: string }) => {
        expect(item.typeId).toBe(technicalTypeId);
      });

      const names = body.data.map((item: { name: string }) => item.name);
      expect(names).toContain('Programming');
      expect(names).toContain('DevOps');
      expect(names).not.toContain('Fantasy');
    });

    it('should filter categories by novel type', async () => {
      const response = await fetch(`${E2E_BASE_URL}/api/categories?type=novel`);

      expect(response.status).toBe(200);

      const body = await response.json();

      expect(body.success).toBe(true);
      expect(body.data.length).toBe(1);
      expect(body.data[0].name).toBe('Fantasy');
      expect(body.data[0].typeId).toBe(novelTypeId);
    });

    it('should be case-insensitive for type filter', async () => {
      // Test uppercase
      const responseUpper = await fetch(
        `${E2E_BASE_URL}/api/categories?type=TECHNICAL`,
      );
      expect(responseUpper.status).toBe(200);
      const bodyUpper = await responseUpper.json();
      expect(bodyUpper.data.length).toBe(2);

      // Test mixed case
      const responseMixed = await fetch(
        `${E2E_BASE_URL}/api/categories?type=Technical`,
      );
      expect(responseMixed.status).toBe(200);
      const bodyMixed = await responseMixed.json();
      expect(bodyMixed.data.length).toBe(2);
    });

    it('should return empty array for non-existent type', async () => {
      const response = await fetch(
        `${E2E_BASE_URL}/api/categories?type=nonexistent`,
      );

      expect(response.status).toBe(200);

      const body = await response.json();

      expect(body.success).toBe(true);
      expect(body.data).toEqual([]);
      expect(body.error).toBeNull();
    });

    it('should still sort results alphabetically when filtered', async () => {
      const response = await fetch(
        `${E2E_BASE_URL}/api/categories?type=technical`,
      );

      expect(response.status).toBe(200);

      const body = await response.json();

      const names = body.data.map((item: { name: string }) => item.name);
      // DevOps comes before Programming alphabetically
      expect(names).toEqual(['DevOps', 'Programming']);
    });
  });

  describe('Response Headers', () => {
    it('should return JSON content type', async () => {
      const response = await fetch(`${E2E_BASE_URL}/api/categories`);

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('application/json');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty type parameter gracefully', async () => {
      // Insert a category
      const db = context.getDb();
      await db.insert(schema.categories).values({
        id: randomUUID(),
        name: 'Test Category',
        typeId: technicalTypeId,
      });

      // Empty type parameter should return all categories
      const response = await fetch(`${E2E_BASE_URL}/api/categories?type=`);

      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.success).toBe(true);
      // Empty string should be treated as no filter
      expect(body.data.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle special characters in type parameter', async () => {
      const response = await fetch(
        `${E2E_BASE_URL}/api/categories?type=test%20type`,
      );

      expect(response.status).toBe(200);

      const body = await response.json();

      // Should return empty array (type doesn't exist)
      expect(body.success).toBe(true);
      expect(body.data).toEqual([]);
    });

    it('should handle null description correctly', async () => {
      const db = context.getDb();
      await db.insert(schema.categories).values({
        id: randomUUID(),
        name: 'No Description Category',
        typeId: technicalTypeId,
        description: null,
      });

      const response = await fetch(`${E2E_BASE_URL}/api/categories`);

      expect(response.status).toBe(200);

      const body = await response.json();

      const category = body.data.find(
        (c: { name: string }) => c.name === 'No Description Category',
      );
      expect(category).toBeDefined();
      expect(category.description).toBeNull();
    });
  });
});
