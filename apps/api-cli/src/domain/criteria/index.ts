/**
 * Criteria Domain Module
 *
 * Exports all Value Objects related to the Criteria pattern.
 * The Criteria pattern provides a domain-level abstraction for filtering,
 * ordering, and paginating data without coupling to infrastructure details.
 */

// Main Criteria class
export { Criteria, type CriteriaProps } from './Criteria.js';

// Filter components
export { Filter } from './Filter.js';
export { Filters } from './Filters.js';
export { FilterField, InvalidFilterFieldError } from './FilterField.js';
export {
  FilterOperator,
  InvalidFilterOperatorError,
  FILTER_OPERATORS,
  type FilterOperatorValue,
} from './FilterOperator.js';
export {
  FilterValue,
  InvalidFilterValueError,
  type FilterValueType,
  type FilterPrimitiveValue,
} from './FilterValue.js';

// Order components
export { Order } from './Order.js';
export { OrderBy, InvalidOrderByError } from './OrderBy.js';
export {
  OrderType,
  InvalidOrderTypeError,
  ORDER_TYPES,
  type OrderTypeValue,
} from './OrderType.js';
