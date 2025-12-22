/**
 * Shared utilities for in-memory stores.
 * Provides common patterns for ID generation, error handling, and validation.
 */

/**
 * Generates a unique ID using timestamp and random string.
 * Format: `{prefix}-{timestamp}-{randomHex}`
 * 
 * @param prefix - Optional prefix for the ID (e.g., "camp", "sess", "asset")
 * @returns A unique ID string
 */
export function generateId(prefix?: string): string {
  const random = Math.random().toString(16).slice(2);
  const timestamp = Date.now();
  return prefix ? `${prefix}-${timestamp}-${random}` : `${timestamp}-${random}`;
}

/**
 * Creates a "not found" error message for an entity.
 * 
 * @param entityType - Type of entity (e.g., "User", "World", "Campaign")
 * @param identifier - The identifier that wasn't found (e.g., username, id)
 * @returns Error message string
 */
export function notFoundError(entityType: string, identifier: string): string {
  return `${entityType} '${identifier}' not found`;
}

/**
 * Creates an "already exists" error message for an entity.
 * 
 * @param entityType - Type of entity (e.g., "User", "World")
 * @param identifier - The identifier that already exists
 * @returns Error message string
 */
export function alreadyExistsError(entityType: string, identifier: string): string {
  return `${entityType} '${identifier}' already exists`;
}

/**
 * Validates that a string value is not empty (after trimming).
 * 
 * @param value - The value to validate
 * @param fieldName - Name of the field for error messages
 * @throws Error if value is empty
 */
export function requireNonEmpty(value: string, fieldName: string): void {
  if (!value || !value.trim()) {
    throw new Error(`${fieldName} is required`);
  }
}

/**
 * Finds an item in an array by a predicate function.
 * Throws if not found.
 * 
 * @param items - Array to search
 * @param predicate - Function to test each item
 * @param errorMessage - Error message if not found
 * @returns The found item
 * @throws Error if item not found
 */
export function findOrThrow<T>(
  items: T[],
  predicate: (item: T) => boolean,
  errorMessage: string
): T {
  const item = items.find(predicate);
  if (!item) {
    throw new Error(errorMessage);
  }
  return item;
}

/**
 * Finds the index of an item in an array by a predicate function.
 * Throws if not found.
 * 
 * @param items - Array to search
 * @param predicate - Function to test each item
 * @param errorMessage - Error message if not found
 * @returns The index of the found item
 * @throws Error if item not found
 */
export function findIndexOrThrow<T>(
  items: T[],
  predicate: (item: T) => boolean,
  errorMessage: string
): number {
  const index = items.findIndex(predicate);
  if (index === -1) {
    throw new Error(errorMessage);
  }
  return index;
}

/**
 * Checks if an item already exists in an array by a predicate function.
 * 
 * @param items - Array to search
 * @param predicate - Function to test each item
 * @returns True if item exists, false otherwise
 */
export function exists<T>(
  items: T[],
  predicate: (item: T) => boolean
): boolean {
  return items.some(predicate);
}
