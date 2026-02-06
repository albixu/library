/**
 * UUID Utility
 *
 * Provides UUID generation for entity identifiers.
 * Uses the native crypto.randomUUID() for secure UUID v4 generation.
 */

/**
 * Generates a new UUID v4
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Validates if a string is a valid UUID v4
 */
export function isValidUUID(value: string): boolean {
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return UUID_REGEX.test(value);
}
