import { describe, it, expect } from 'vitest';
import { Order } from '../../../../src/domain/criteria/Order.js';
import { OrderBy } from '../../../../src/domain/criteria/OrderBy.js';
import { OrderType } from '../../../../src/domain/criteria/OrderType.js';

describe('Order', () => {
  describe('create', () => {
    it('should create Order with field and direction', () => {
      const order = Order.create('title', 'ASC');
      expect(order.orderBy.value).toBe('title');
      expect(order.orderType.value).toBe('ASC');
    });

    it('should normalize direction to uppercase', () => {
      const order = Order.create('title', 'desc');
      expect(order.orderType.value).toBe('DESC');
    });

    it('should throw for invalid field', () => {
      expect(() => Order.create('', 'ASC')).toThrow();
    });

    it('should throw for invalid direction', () => {
      expect(() => Order.create('title', 'INVALID')).toThrow();
    });
  });

  describe('asc', () => {
    it('should create ascending order', () => {
      const order = Order.asc('title');
      expect(order.orderBy.value).toBe('title');
      expect(order.orderType.equals(OrderType.ASC)).toBe(true);
    });

    it('should throw for invalid field', () => {
      expect(() => Order.asc('')).toThrow();
    });
  });

  describe('desc', () => {
    it('should create descending order', () => {
      const order = Order.desc('created_at');
      expect(order.orderBy.value).toBe('created_at');
      expect(order.orderType.equals(OrderType.DESC)).toBe(true);
    });

    it('should throw for invalid field', () => {
      expect(() => Order.desc('')).toThrow();
    });
  });

  describe('none', () => {
    it('should create no-order specification', () => {
      const order = Order.none();
      expect(order.orderBy.isNone()).toBe(true);
      expect(order.orderType.isNone()).toBe(true);
    });

    it('should return true for isNone', () => {
      expect(Order.none().isNone()).toBe(true);
    });
  });

  describe('isNone', () => {
    it('should return true when order type is NONE', () => {
      const order = Order.none();
      expect(order.isNone()).toBe(true);
    });

    it('should return false for ASC order', () => {
      const order = Order.asc('title');
      expect(order.isNone()).toBe(false);
    });

    it('should return false for DESC order', () => {
      const order = Order.desc('title');
      expect(order.isNone()).toBe(false);
    });
  });

  describe('isAsc', () => {
    it('should return true for ascending order', () => {
      const order = Order.asc('title');
      expect(order.isAsc()).toBe(true);
    });

    it('should return false for descending order', () => {
      const order = Order.desc('title');
      expect(order.isAsc()).toBe(false);
    });

    it('should return false for no order', () => {
      const order = Order.none();
      expect(order.isAsc()).toBe(false);
    });
  });

  describe('isDesc', () => {
    it('should return true for descending order', () => {
      const order = Order.desc('title');
      expect(order.isDesc()).toBe(true);
    });

    it('should return false for ascending order', () => {
      const order = Order.asc('title');
      expect(order.isDesc()).toBe(false);
    });

    it('should return false for no order', () => {
      const order = Order.none();
      expect(order.isDesc()).toBe(false);
    });
  });

  describe('equals', () => {
    it('should return true for orders with same field and direction', () => {
      const order1 = Order.asc('title');
      const order2 = Order.asc('title');
      expect(order1.equals(order2)).toBe(true);
    });

    it('should return false for orders with different fields', () => {
      const order1 = Order.asc('title');
      const order2 = Order.asc('author');
      expect(order1.equals(order2)).toBe(false);
    });

    it('should return false for orders with different directions', () => {
      const order1 = Order.asc('title');
      const order2 = Order.desc('title');
      expect(order1.equals(order2)).toBe(false);
    });

    it('should return true for two none orders', () => {
      expect(Order.none().equals(Order.none())).toBe(true);
    });
  });

  describe('toString', () => {
    it('should return formatted string for ascending order', () => {
      const order = Order.asc('title');
      expect(order.toString()).toBe('title ASC');
    });

    it('should return formatted string for descending order', () => {
      const order = Order.desc('created_at');
      expect(order.toString()).toBe('created_at DESC');
    });

    it('should return "(no order)" for none order', () => {
      const order = Order.none();
      expect(order.toString()).toBe('(no order)');
    });
  });

  describe('immutability', () => {
    it('should be frozen', () => {
      const order = Order.asc('title');
      expect(Object.isFrozen(order)).toBe(true);
    });

    it('should not allow property modification', () => {
      const order = Order.asc('title');
      expect(() => {
        // @ts-expect-error - Testing runtime immutability
        order.orderBy = OrderBy.create('modified');
      }).toThrow();
    });
  });
});
