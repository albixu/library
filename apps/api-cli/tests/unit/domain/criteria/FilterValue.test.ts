import { describe, it, expect } from 'vitest';
import {
  FilterValue,
  InvalidFilterValueError,
} from '../../../../src/domain/criteria/FilterValue.js';

describe('FilterValue', () => {
  describe('create', () => {
    describe('string values', () => {
      it('should create FilterValue from string', () => {
        const value = FilterValue.create('test');
        expect(value.value).toBe('test');
      });

      it('should create FilterValue from empty string', () => {
        const value = FilterValue.create('');
        expect(value.value).toBe('');
      });
    });

    describe('number values', () => {
      it('should create FilterValue from positive number', () => {
        const value = FilterValue.create(42);
        expect(value.value).toBe(42);
      });

      it('should create FilterValue from zero', () => {
        const value = FilterValue.create(0);
        expect(value.value).toBe(0);
      });

      it('should create FilterValue from negative number', () => {
        const value = FilterValue.create(-10);
        expect(value.value).toBe(-10);
      });

      it('should create FilterValue from decimal', () => {
        const value = FilterValue.create(3.14);
        expect(value.value).toBe(3.14);
      });
    });

    describe('boolean values', () => {
      it('should create FilterValue from true', () => {
        const value = FilterValue.create(true);
        expect(value.value).toBe(true);
      });

      it('should create FilterValue from false', () => {
        const value = FilterValue.create(false);
        expect(value.value).toBe(false);
      });
    });

    describe('array values', () => {
      it('should create FilterValue from string array', () => {
        const value = FilterValue.create(['a', 'b', 'c']);
        expect(value.value).toEqual(['a', 'b', 'c']);
      });

      it('should create FilterValue from number array', () => {
        const value = FilterValue.create([1, 2, 3]);
        expect(value.value).toEqual([1, 2, 3]);
      });

      it('should freeze array values', () => {
        const value = FilterValue.create(['a', 'b']);
        expect(Object.isFrozen(value.value)).toBe(true);
      });

      it('should throw InvalidFilterValueError for empty array', () => {
        expect(() => FilterValue.create([])).toThrow(InvalidFilterValueError);
      });
    });

    describe('invalid values', () => {
      it('should throw InvalidFilterValueError for null', () => {
        expect(() => FilterValue.create(null as unknown as string)).toThrow(
          InvalidFilterValueError,
        );
      });

      it('should throw InvalidFilterValueError for undefined', () => {
        expect(() => FilterValue.create(undefined as unknown as string)).toThrow(
          InvalidFilterValueError,
        );
      });
    });
  });

  describe('type checking methods', () => {
    it('should correctly identify array', () => {
      const value = FilterValue.create(['a', 'b']);
      expect(value.isArray()).toBe(true);
      expect(value.isString()).toBe(false);
      expect(value.isNumber()).toBe(false);
      expect(value.isBoolean()).toBe(false);
    });

    it('should correctly identify string', () => {
      const value = FilterValue.create('test');
      expect(value.isString()).toBe(true);
      expect(value.isArray()).toBe(false);
      expect(value.isNumber()).toBe(false);
      expect(value.isBoolean()).toBe(false);
    });

    it('should correctly identify number', () => {
      const value = FilterValue.create(42);
      expect(value.isNumber()).toBe(true);
      expect(value.isArray()).toBe(false);
      expect(value.isString()).toBe(false);
      expect(value.isBoolean()).toBe(false);
    });

    it('should correctly identify boolean', () => {
      const value = FilterValue.create(true);
      expect(value.isBoolean()).toBe(true);
      expect(value.isArray()).toBe(false);
      expect(value.isString()).toBe(false);
      expect(value.isNumber()).toBe(false);
    });
  });

  describe('asStringArray', () => {
    it('should return array when value is array', () => {
      const value = FilterValue.create(['a', 'b', 'c']);
      expect(value.asStringArray()).toEqual(['a', 'b', 'c']);
    });

    it('should throw when value is not array', () => {
      const value = FilterValue.create('test');
      expect(() => value.asStringArray()).toThrow('FilterValue is not an array');
    });
  });

  describe('equals', () => {
    it('should return true for equal string values', () => {
      const value1 = FilterValue.create('test');
      const value2 = FilterValue.create('test');
      expect(value1.equals(value2)).toBe(true);
    });

    it('should return false for different string values', () => {
      const value1 = FilterValue.create('test');
      const value2 = FilterValue.create('other');
      expect(value1.equals(value2)).toBe(false);
    });

    it('should return true for equal number values', () => {
      const value1 = FilterValue.create(42);
      const value2 = FilterValue.create(42);
      expect(value1.equals(value2)).toBe(true);
    });

    it('should return true for equal array values', () => {
      const value1 = FilterValue.create(['a', 'b']);
      const value2 = FilterValue.create(['a', 'b']);
      expect(value1.equals(value2)).toBe(true);
    });

    it('should return false for arrays with different length', () => {
      const value1 = FilterValue.create(['a', 'b']);
      const value2 = FilterValue.create(['a', 'b', 'c']);
      expect(value1.equals(value2)).toBe(false);
    });

    it('should return false for arrays with different values', () => {
      const value1 = FilterValue.create(['a', 'b']);
      const value2 = FilterValue.create(['a', 'c']);
      expect(value1.equals(value2)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return string representation for string value', () => {
      const value = FilterValue.create('test');
      expect(value.toString()).toBe('test');
    });

    it('should return string representation for number value', () => {
      const value = FilterValue.create(42);
      expect(value.toString()).toBe('42');
    });

    it('should return string representation for array value', () => {
      const value = FilterValue.create(['a', 'b', 'c']);
      expect(value.toString()).toBe('[a, b, c]');
    });
  });

  describe('immutability', () => {
    it('should be frozen', () => {
      const value = FilterValue.create('test');
      expect(Object.isFrozen(value)).toBe(true);
    });

    it('should not allow property modification', () => {
      const value = FilterValue.create('test');
      expect(() => {
        // @ts-expect-error - Testing runtime immutability
        value.value = 'modified';
      }).toThrow();
    });
  });
});
