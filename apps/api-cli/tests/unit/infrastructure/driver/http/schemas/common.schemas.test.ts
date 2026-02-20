/**
 * Common Schemas Unit Tests
 *
 * Tests for the standardized API response structure.
 */

import { describe, it, expect } from 'vitest';
import {
  successResponse,
  errorResponse,
  type ApiResponse,
  type ApiError,
} from '../../../../../../src/infrastructure/driver/http/schemas/common.schemas.js';

describe('Common API Response Schemas', () => {
  describe('successResponse', () => {
    it('should create a success response with data object', () => {
      const data = { id: '123', name: 'Test' };

      const response = successResponse(data);

      expect(response).toEqual({
        success: true,
        data: { id: '123', name: 'Test' },
        error: null,
      });
    });

    it('should create a success response with data array', () => {
      const data = [{ id: '1' }, { id: '2' }];

      const response = successResponse(data);

      expect(response).toEqual({
        success: true,
        data: [{ id: '1' }, { id: '2' }],
        error: null,
      });
    });

    it('should create a success response with null data', () => {
      const response = successResponse(null);

      expect(response).toEqual({
        success: true,
        data: null,
        error: null,
      });
    });

    it('should create a success response with empty array', () => {
      const response = successResponse([]);

      expect(response).toEqual({
        success: true,
        data: [],
        error: null,
      });
    });

    it('should have success property as true', () => {
      const response = successResponse({ test: 'value' });

      expect(response.success).toBe(true);
    });

    it('should have error property as null', () => {
      const response = successResponse({ test: 'value' });

      expect(response.error).toBeNull();
    });
  });

  describe('errorResponse', () => {
    it('should create an error response with message only', () => {
      const response = errorResponse('Something went wrong');

      expect(response).toEqual({
        success: false,
        data: null,
        error: {
          message: 'Something went wrong',
        },
      });
    });

    it('should create an error response with message and details', () => {
      const response = errorResponse('Validation failed', [
        'title is required',
        'author is required',
      ]);

      expect(response).toEqual({
        success: false,
        data: null,
        error: {
          message: 'Validation failed',
          details: ['title is required', 'author is required'],
        },
      });
    });

    it('should create an error response with empty details array', () => {
      const response = errorResponse('Error occurred', []);

      expect(response).toEqual({
        success: false,
        data: null,
        error: {
          message: 'Error occurred',
          details: [],
        },
      });
    });

    it('should have success property as false', () => {
      const response = errorResponse('Error');

      expect(response.success).toBe(false);
    });

    it('should have data property as null', () => {
      const response = errorResponse('Error');

      expect(response.data).toBeNull();
    });

    it('should not include details property when not provided', () => {
      const response = errorResponse('Simple error');

      expect(response.error).not.toHaveProperty('details');
    });
  });

  describe('Type Safety', () => {
    it('should allow typed data in success response', () => {
      interface Book {
        id: string;
        title: string;
      }

      const book: Book = { id: '123', title: 'Clean Code' };
      const response: ApiResponse<Book> = successResponse(book);

      expect(response.data?.title).toBe('Clean Code');
    });

    it('should allow array typed data in success response', () => {
      interface BookType {
        id: string;
        name: string;
      }

      const types: BookType[] = [
        { id: '1', name: 'technical' },
        { id: '2', name: 'novel' },
      ];
      const response: ApiResponse<BookType[]> = successResponse(types);

      expect(response.data).toHaveLength(2);
      expect(response.data?.[0].name).toBe('technical');
    });
  });

  describe('ApiError type', () => {
    it('should allow creating ApiError with message only', () => {
      const error: ApiError = {
        message: 'Test error',
      };

      expect(error.message).toBe('Test error');
      expect(error.details).toBeUndefined();
    });

    it('should allow creating ApiError with message and details', () => {
      const error: ApiError = {
        message: 'Validation error',
        details: ['field1 invalid', 'field2 required'],
      };

      expect(error.message).toBe('Validation error');
      expect(error.details).toEqual(['field1 invalid', 'field2 required']);
    });
  });
});
