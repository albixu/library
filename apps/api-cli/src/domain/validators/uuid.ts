/**
 * UUID Validation
 *
 * Centralized UUID validation for domain entities.
 * This provides a single source of truth for UUID v4 validation.
 */

import { InvalidUUIDError, RequiredFieldError } from '../errors/DomainErrors.js';

/**
 * UUID v4 regex pattern
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Checks if a string is a valid UUID v4
 */
export function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

/**
 * Validates an ID field, ensuring it's a valid UUID v4
 * @throws RequiredFieldError if ID is empty
 * @throws InvalidUUIDError if ID is not a valid UUID v4
 * @returns The trimmed, validated ID
 */
export function validateId(id: string): string {
  if (!id || id.trim().length === 0) {
    throw new RequiredFieldError('id');
  }

  const trimmedId = id.trim();

  if (!isValidUUID(trimmedId)) {
    throw new InvalidUUIDError(id);
  }

  return trimmedId;
}
