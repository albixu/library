/**
 * E2E Tests: GET /api/book-types
 *
 * End-to-end tests for the book types listing API endpoint.
 * These tests validate the complete flow from HTTP request to database query.
 *
 * Tests cover:
 * - Successful listing with standardized response (200)
 * - Alphabetical sorting verification
 * - Response format verification (id, name only)
 *
 * Part of HU-005: List Book Types Endpoint
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createE2EContext, E2E_BASE_URL } from '../setup.js';

describe('GET /api/book-types (E2E)', () => {
  const context = createE2EContext();

  beforeAll(async () => {
    await context.setup();
  });

  afterAll(async () => {
    await context.teardown();
  });

  describe('Successful Listing', () => {
    it('should return 200 with standardized success response', async () => {
      const response = await fetch(`${E2E_BASE_URL}/api/book-types`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
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

    it('should return array of book types from database', async () => {
      const response = await fetch(`${E2E_BASE_URL}/api/book-types`);

      expect(response.status).toBe(200);

      const body = await response.json();

      // Verify we have book types (seeded in database)
      expect(body.data.length).toBeGreaterThan(0);

      // Each item should have id and name
      body.data.forEach((item: { id: string; name: string }) => {
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('name');
        expect(typeof item.id).toBe('string');
        expect(typeof item.name).toBe('string');
      });
    });

    it('should return types sorted alphabetically by name', async () => {
      const response = await fetch(`${E2E_BASE_URL}/api/book-types`);

      expect(response.status).toBe(200);

      const body = await response.json();

      // Verify alphabetical sorting
      const names = body.data.map((item: { name: string }) => item.name);
      const sortedNames = [...names].sort((a, b) => a.localeCompare(b));
      
      expect(names).toEqual(sortedNames);
    });

    it('should return only id and name fields (no createdAt/updatedAt)', async () => {
      const response = await fetch(`${E2E_BASE_URL}/api/book-types`);

      expect(response.status).toBe(200);

      const body = await response.json();

      // Verify each item has only id and name
      body.data.forEach((item: Record<string, unknown>) => {
        expect(Object.keys(item).sort()).toEqual(['id', 'name']);
        expect(item).not.toHaveProperty('createdAt');
        expect(item).not.toHaveProperty('updatedAt');
      });
    });

    it('should return valid UUID format for ids', async () => {
      const response = await fetch(`${E2E_BASE_URL}/api/book-types`);

      expect(response.status).toBe(200);

      const body = await response.json();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      body.data.forEach((item: { id: string }) => {
        expect(item.id).toMatch(uuidRegex);
      });
    });

    it('should include expected book types from seed data', async () => {
      const response = await fetch(`${E2E_BASE_URL}/api/book-types`);

      expect(response.status).toBe(200);

      const body = await response.json();
      const names = body.data.map((item: { name: string }) => item.name);

      // These types should exist from init-db.sql seed data
      expect(names).toContain('technical');
      expect(names).toContain('novel');
    });
  });

  describe('Response Headers', () => {
    it('should return JSON content type', async () => {
      const response = await fetch(`${E2E_BASE_URL}/api/book-types`);

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('application/json');
    });
  });
});
