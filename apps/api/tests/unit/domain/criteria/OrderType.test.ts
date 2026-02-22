import { describe, it, expect } from 'vitest';
import {
  OrderType,
  InvalidOrderTypeError,
  ORDER_TYPES,
} from '../../../../src/domain/criteria/OrderType.js';

describe('OrderType', () => {
  describe('static instances', () => {
    it('should have ASC order type', () => {
      expect(OrderType.ASC.value).toBe('ASC');
    });

    it('should have DESC order type', () => {
      expect(OrderType.DESC.value).toBe('DESC');
    });

    it('should have NONE order type', () => {
      expect(OrderType.NONE.value).toBe('NONE');
    });
  });

  describe('fromValue', () => {
    it('should create order type from valid string value', () => {
      const orderType = OrderType.fromValue('ASC');
      expect(orderType.value).toBe('ASC');
    });

    it('should normalize input to uppercase', () => {
      const orderType = OrderType.fromValue('desc');
      expect(orderType.value).toBe('DESC');
    });

    it('should handle mixed case', () => {
      const orderType = OrderType.fromValue('Asc');
      expect(orderType.value).toBe('ASC');
    });

    it('should throw InvalidOrderTypeError for invalid value', () => {
      expect(() => OrderType.fromValue('INVALID')).toThrow(
        InvalidOrderTypeError,
      );
    });

    it('should throw with descriptive message', () => {
      try {
        OrderType.fromValue('bad_order');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidOrderTypeError);
        expect((error as Error).message).toContain('bad_order');
        expect((error as Error).message).toContain('Valid types are');
      }
    });
  });

  describe('isValid', () => {
    it('should return true for all valid order types', () => {
      for (const type of ORDER_TYPES) {
        expect(OrderType.isValid(type)).toBe(true);
      }
    });

    it('should return false for invalid order types', () => {
      expect(OrderType.isValid('INVALID')).toBe(false);
      expect(OrderType.isValid('')).toBe(false);
      expect(OrderType.isValid('asc')).toBe(false); // case sensitive
    });
  });

  describe('isNone', () => {
    it('should return true for NONE order type', () => {
      expect(OrderType.NONE.isNone()).toBe(true);
    });

    it('should return false for ASC order type', () => {
      expect(OrderType.ASC.isNone()).toBe(false);
    });

    it('should return false for DESC order type', () => {
      expect(OrderType.DESC.isNone()).toBe(false);
    });
  });

  describe('isAsc', () => {
    it('should return true for ASC order type', () => {
      expect(OrderType.ASC.isAsc()).toBe(true);
    });

    it('should return false for DESC order type', () => {
      expect(OrderType.DESC.isAsc()).toBe(false);
    });

    it('should return false for NONE order type', () => {
      expect(OrderType.NONE.isAsc()).toBe(false);
    });
  });

  describe('isDesc', () => {
    it('should return true for DESC order type', () => {
      expect(OrderType.DESC.isDesc()).toBe(true);
    });

    it('should return false for ASC order type', () => {
      expect(OrderType.ASC.isDesc()).toBe(false);
    });

    it('should return false for NONE order type', () => {
      expect(OrderType.NONE.isDesc()).toBe(false);
    });
  });

  describe('equals', () => {
    it('should return true for order types with same value', () => {
      const type1 = OrderType.ASC;
      const type2 = OrderType.fromValue('ASC');
      expect(type1.equals(type2)).toBe(true);
    });

    it('should return false for order types with different values', () => {
      expect(OrderType.ASC.equals(OrderType.DESC)).toBe(false);
      expect(OrderType.ASC.equals(OrderType.NONE)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return the string value', () => {
      expect(OrderType.ASC.toString()).toBe('ASC');
      expect(OrderType.DESC.toString()).toBe('DESC');
      expect(OrderType.NONE.toString()).toBe('NONE');
    });
  });

  describe('immutability', () => {
    it('should be frozen', () => {
      expect(Object.isFrozen(OrderType.ASC)).toBe(true);
      expect(Object.isFrozen(OrderType.DESC)).toBe(true);
      expect(Object.isFrozen(OrderType.NONE)).toBe(true);
    });

    it('should not allow property modification', () => {
      expect(() => {
        // @ts-expect-error - Testing runtime immutability
        OrderType.ASC.value = 'MODIFIED';
      }).toThrow();
    });
  });
});
