import { describe, it, expect } from 'vitest';
import {
  FilterField,
  InvalidFilterFieldError,
} from '../../../../src/domain/criteria/FilterField.js';

describe('FilterField', () => {
  describe('create', () => {
    it('should create a valid FilterField', () => {
      const field = FilterField.create('title');
      expect(field.value).toBe('title');
    });

    it('should trim whitespace from field name', () => {
      const field = FilterField.create('  author  ');
      expect(field.value).toBe('author');
    });

    it('should throw InvalidFilterFieldError for empty string', () => {
      expect(() => FilterField.create('')).toThrow(InvalidFilterFieldError);
    });

    it('should throw InvalidFilterFieldError for whitespace-only string', () => {
      expect(() => FilterField.create('   ')).toThrow(InvalidFilterFieldError);
    });

    it('should throw with descriptive message', () => {
      try {
        FilterField.create('');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidFilterFieldError);
        expect((error as Error).message).toContain('cannot be empty');
      }
    });
  });

  describe('fromPersistence', () => {
    it('should create FilterField without validation', () => {
      const field = FilterField.fromPersistence('category');
      expect(field.value).toBe('category');
    });
  });

  describe('equals', () => {
    it('should return true for fields with same value', () => {
      const field1 = FilterField.create('title');
      const field2 = FilterField.create('title');
      expect(field1.equals(field2)).toBe(true);
    });

    it('should return false for fields with different values', () => {
      const field1 = FilterField.create('title');
      const field2 = FilterField.create('author');
      expect(field1.equals(field2)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return the field name', () => {
      const field = FilterField.create('isbn');
      expect(field.toString()).toBe('isbn');
    });
  });

  describe('immutability', () => {
    it('should be frozen', () => {
      const field = FilterField.create('title');
      expect(Object.isFrozen(field)).toBe(true);
    });

    it('should not allow property modification', () => {
      const field = FilterField.create('title');
      expect(() => {
        // @ts-expect-error - Testing runtime immutability
        field.value = 'modified';
      }).toThrow();
    });
  });
});
