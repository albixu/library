import { describe, it, expect } from 'vitest';
import {
  FilterOperator,
  InvalidFilterOperatorError,
  FILTER_OPERATORS,
} from '../../../../src/domain/criteria/FilterOperator.js';

describe('FilterOperator', () => {
  describe('static instances', () => {
    it('should have EQUALS operator', () => {
      expect(FilterOperator.EQUALS.value).toBe('EQUALS');
    });

    it('should have NOT_EQUALS operator', () => {
      expect(FilterOperator.NOT_EQUALS.value).toBe('NOT_EQUALS');
    });

    it('should have CONTAINS operator', () => {
      expect(FilterOperator.CONTAINS.value).toBe('CONTAINS');
    });

    it('should have IN operator', () => {
      expect(FilterOperator.IN.value).toBe('IN');
    });

    it('should have GT operator', () => {
      expect(FilterOperator.GT.value).toBe('GT');
    });

    it('should have LT operator', () => {
      expect(FilterOperator.LT.value).toBe('LT');
    });

    it('should have GTE operator', () => {
      expect(FilterOperator.GTE.value).toBe('GTE');
    });

    it('should have LTE operator', () => {
      expect(FilterOperator.LTE.value).toBe('LTE');
    });

    it('should have SIMILAR_TO operator', () => {
      expect(FilterOperator.SIMILAR_TO.value).toBe('SIMILAR_TO');
    });
  });

  describe('fromValue', () => {
    it('should create operator from valid string value', () => {
      const op = FilterOperator.fromValue('EQUALS');
      expect(op.value).toBe('EQUALS');
    });

    it('should normalize input to uppercase', () => {
      const op = FilterOperator.fromValue('equals');
      expect(op.value).toBe('EQUALS');
    });

    it('should handle mixed case', () => {
      const op = FilterOperator.fromValue('Contains');
      expect(op.value).toBe('CONTAINS');
    });

    it('should throw InvalidFilterOperatorError for invalid value', () => {
      expect(() => FilterOperator.fromValue('INVALID')).toThrow(
        InvalidFilterOperatorError,
      );
    });

    it('should throw with descriptive message', () => {
      try {
        FilterOperator.fromValue('bad_operator');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidFilterOperatorError);
        expect((error as Error).message).toContain('bad_operator');
        expect((error as Error).message).toContain('Valid operators are');
      }
    });
  });

  describe('isValid', () => {
    it('should return true for all valid operators', () => {
      for (const op of FILTER_OPERATORS) {
        expect(FilterOperator.isValid(op)).toBe(true);
      }
    });

    it('should return false for invalid operators', () => {
      expect(FilterOperator.isValid('INVALID')).toBe(false);
      expect(FilterOperator.isValid('')).toBe(false);
      expect(FilterOperator.isValid('equals')).toBe(false); // case sensitive
    });
  });

  describe('getAllOperators', () => {
    it('should return all valid operators', () => {
      const ops = FilterOperator.getAllOperators();
      expect(ops).toEqual(FILTER_OPERATORS);
      expect(ops.length).toBeGreaterThan(0);
    });
  });

  describe('equals', () => {
    it('should return true for operators with same value', () => {
      const op1 = FilterOperator.EQUALS;
      const op2 = FilterOperator.fromValue('EQUALS');
      expect(op1.equals(op2)).toBe(true);
    });

    it('should return false for operators with different values', () => {
      expect(FilterOperator.EQUALS.equals(FilterOperator.CONTAINS)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return the string value', () => {
      expect(FilterOperator.EQUALS.toString()).toBe('EQUALS');
      expect(FilterOperator.SIMILAR_TO.toString()).toBe('SIMILAR_TO');
    });
  });

  describe('immutability', () => {
    it('should be frozen', () => {
      expect(Object.isFrozen(FilterOperator.EQUALS)).toBe(true);
    });

    it('should not allow property modification', () => {
      expect(() => {
        // @ts-expect-error - Testing runtime immutability
        FilterOperator.EQUALS.value = 'MODIFIED';
      }).toThrow();
    });
  });
});
