/**
 * Order Value Object
 *
 * Represents the complete ordering specification: field and direction.
 */

import { OrderBy } from './OrderBy.js';
import { OrderType } from './OrderType.js';

/**
 * Order Value Object
 *
 * Combines the field to order by and the sort direction.
 * Immutable and self-validating.
 */
export class Order {
  private constructor(
    public readonly orderBy: OrderBy,
    public readonly orderType: OrderType,
  ) {
    Object.freeze(this);
  }

  /**
   * Creates an Order from field name and direction
   */
  static create(orderBy: string, orderType: string): Order {
    return new Order(
      OrderBy.create(orderBy),
      OrderType.fromValue(orderType),
    );
  }

  /**
   * Creates an ascending order
   */
  static asc(orderBy: string): Order {
    return new Order(OrderBy.create(orderBy), OrderType.ASC);
  }

  /**
   * Creates a descending order
   */
  static desc(orderBy: string): Order {
    return new Order(OrderBy.create(orderBy), OrderType.DESC);
  }

  /**
   * Creates a "no order" specification
   */
  static none(): Order {
    return new Order(OrderBy.none(), OrderType.NONE);
  }

  /**
   * Checks if this represents no ordering
   */
  isNone(): boolean {
    return this.orderType.isNone() || this.orderBy.isNone();
  }

  /**
   * Checks if this is ascending order
   */
  isAsc(): boolean {
    return this.orderType.isAsc();
  }

  /**
   * Checks if this is descending order
   */
  isDesc(): boolean {
    return this.orderType.isDesc();
  }

  equals(other: Order): boolean {
    return (
      this.orderBy.equals(other.orderBy) &&
      this.orderType.equals(other.orderType)
    );
  }

  toString(): string {
    if (this.isNone()) {
      return '(no order)';
    }
    return `${this.orderBy.value} ${this.orderType.value}`;
  }
}
