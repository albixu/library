/**
 * Book Level Schemas Unit Tests
 *
 * Tests for the Zod schemas used in GET /api/book-levels endpoint.
 * HU-010: Validates query parameters and response structure.
 */

import { describe, it, expect } from 'vitest';
import {
  listBookLevelsQuerySchema,
  bookLevelListItemSchema,
  bookLevelListResponseSchema,
  type ListBookLevelsQuery,
  type BookLevelListItemResponse,
  type BookLevelListResponse,
} from '../../../../../../src/infrastructure/driver/http/schemas/book-level.schemas.js';

describe('Book Level Schemas', () => {
  describe('listBookLevelsQuerySchema', () => {
    it('should parse valid type query parameter', () => {
      const result = listBookLevelsQuerySchema.parse({ type: 'technical' });

      expect(result).toEqual({ type: 'technical' });
    });

    it('should allow empty query (no type filter)', () => {
      const result = listBookLevelsQuerySchema.parse({});

      expect(result).toEqual({ type: undefined });
    });

    it('should trim whitespace from type parameter', () => {
      const result = listBookLevelsQuerySchema.parse({ type: '  technical  ' });

      expect(result).toEqual({ type: 'technical' });
    });

    it('should transform empty string to undefined', () => {
      const result = listBookLevelsQuerySchema.parse({ type: '' });

      expect(result).toEqual({ type: undefined });
    });

    it('should transform whitespace-only string to undefined', () => {
      const result = listBookLevelsQuerySchema.parse({ type: '   ' });

      expect(result).toEqual({ type: undefined });
    });

    it('should reject type exceeding 100 characters', () => {
      const longType = 'a'.repeat(101);

      expect(() => listBookLevelsQuerySchema.parse({ type: longType })).toThrow(
        'type exceeds maximum length of 100 characters',
      );
    });

    it('should accept type at exactly 100 characters', () => {
      const maxType = 'a'.repeat(100);

      const result = listBookLevelsQuerySchema.parse({ type: maxType });

      expect(result.type).toBe(maxType);
    });

    it('should preserve case of type parameter', () => {
      const result = listBookLevelsQuerySchema.parse({ type: 'TECHNICAL' });

      expect(result).toEqual({ type: 'TECHNICAL' });
    });

    it('should ignore additional properties', () => {
      const result = listBookLevelsQuerySchema.parse({
        type: 'technical',
        extra: 'ignored',
      });

      expect(result).toEqual({ type: 'technical' });
    });
  });

  describe('bookLevelListItemSchema', () => {
    const validItem = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'advanced',
    };

    it('should parse valid book level item', () => {
      const result = bookLevelListItemSchema.parse(validItem);

      expect(result).toEqual(validItem);
    });

    it('should require id to be a valid UUID', () => {
      expect(() =>
        bookLevelListItemSchema.parse({ ...validItem, id: 'invalid' }),
      ).toThrow();
    });

    it('should require name to be a string', () => {
      expect(() =>
        bookLevelListItemSchema.parse({ ...validItem, name: 123 }),
      ).toThrow();
    });

    it('should require id field', () => {
      expect(() =>
        bookLevelListItemSchema.parse({ name: 'advanced' }),
      ).toThrow();
    });

    it('should require name field', () => {
      expect(() =>
        bookLevelListItemSchema.parse({ id: validItem.id }),
      ).toThrow();
    });

    it('should only include id and name (no extra fields)', () => {
      const result = bookLevelListItemSchema.parse({
        ...validItem,
        createdAt: new Date(),
        updatedAt: new Date(),
        extra: 'field',
      });

      expect(result).toEqual(validItem);
    });
  });

  describe('bookLevelListResponseSchema', () => {
    const validResponse = {
      success: true,
      data: [
        { id: '550e8400-e29b-41d4-a716-446655440001', name: 'advanced' },
        { id: '550e8400-e29b-41d4-a716-446655440002', name: 'beginner' },
      ],
      error: null,
    };

    it('should parse valid response', () => {
      const result = bookLevelListResponseSchema.parse(validResponse);

      expect(result).toEqual(validResponse);
    });

    it('should parse response with empty data array', () => {
      const emptyResponse = {
        success: true,
        data: [],
        error: null,
      };

      const result = bookLevelListResponseSchema.parse(emptyResponse);

      expect(result.data).toEqual([]);
    });

    it('should require success to be true', () => {
      expect(() =>
        bookLevelListResponseSchema.parse({
          ...validResponse,
          success: false,
        }),
      ).toThrow();
    });

    it('should require error to be null', () => {
      expect(() =>
        bookLevelListResponseSchema.parse({
          ...validResponse,
          error: { message: 'Error' },
        }),
      ).toThrow();
    });

    it('should require data to be an array', () => {
      expect(() =>
        bookLevelListResponseSchema.parse({
          ...validResponse,
          data: 'not an array',
        }),
      ).toThrow();
    });

    it('should validate each item in data array', () => {
      expect(() =>
        bookLevelListResponseSchema.parse({
          ...validResponse,
          data: [{ id: 'invalid-uuid', name: 'test' }],
        }),
      ).toThrow();
    });
  });

  describe('Type inference', () => {
    it('should correctly type ListBookLevelsQuery', () => {
      const query: ListBookLevelsQuery = { type: 'technical' };

      expect(query.type).toBe('technical');
    });

    it('should correctly type BookLevelListItemResponse', () => {
      const item: BookLevelListItemResponse = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'advanced',
      };

      expect(item.id).toBeDefined();
      expect(item.name).toBeDefined();
    });

    it('should correctly type BookLevelListResponse', () => {
      const response: BookLevelListResponse = {
        success: true,
        data: [{ id: '550e8400-e29b-41d4-a716-446655440001', name: 'beginner' }],
        error: null,
      };

      expect(response.success).toBe(true);
      expect(response.data).toHaveLength(1);
    });
  });
});
