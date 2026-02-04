const STORAGE_PREFIX = 'kanban_';

/**
 * Error thrown when localStorage quota is exceeded.
 * Callers can catch this to handle storage limits gracefully.
 */
export class StorageQuotaError extends Error {
  constructor(key: string, originalError: unknown) {
    super(`localStorage quota exceeded when writing key "${key}"`);
    this.name = 'StorageQuotaError';
    this.cause = originalError;
  }
}

export interface StorageSetResult {
  success: boolean;
  error?: StorageQuotaError;
}

export const storage = {
  /**
   * Returns the full prefixed key for a given key name.
   * Useful for storage event listeners that receive the raw key.
   */
  getFullKey: (key: string): string => {
    return STORAGE_PREFIX + key;
  },

  /**
   * Extracts the unprefixed key from a full localStorage key.
   * Returns null if the key doesn't have our prefix.
   */
  parseKey: (fullKey: string): string | null => {
    if (fullKey.startsWith(STORAGE_PREFIX)) {
      return fullKey.slice(STORAGE_PREFIX.length);
    }
    return null;
  },

  get: <T>(key: string, defaultValue: T): T => {
    const fullKey = STORAGE_PREFIX + key;
    try {
      const item = localStorage.getItem(fullKey);
      if (item === null) {
        return defaultValue;
      }

      const parsed = JSON.parse(item);

      // Validate that parsed value is of expected type (basic check)
      // If defaultValue is an object, parsed should also be an object (not null/array for objects)
      if (typeof defaultValue === 'object' && defaultValue !== null && !Array.isArray(defaultValue)) {
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          console.warn(`Corrupted localStorage value for "${key}": expected object, got ${typeof parsed}. Clearing.`);
          storage.remove(key);
          return defaultValue;
        }
      }

      return parsed as T;
    } catch (error) {
      // JSON parse failed - data is corrupted
      console.warn(`Failed to parse localStorage value for "${key}". Clearing corrupted data.`, error);
      try {
        localStorage.removeItem(fullKey);
      } catch {
        // Ignore removal errors
      }
      return defaultValue;
    }
  },

  /**
   * Stores a value in localStorage.
   * @returns StorageSetResult indicating success or failure with error details.
   * @throws StorageQuotaError if throwOnQuotaError is true and quota is exceeded.
   */
  set: <T>(key: string, value: T, options?: { throwOnQuotaError?: boolean }): StorageSetResult => {
    try {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
      return { success: true };
    } catch (error) {
      // Check if this is a quota exceeded error
      const isQuotaError =
        error instanceof DOMException &&
        (error.name === 'QuotaExceededError' ||
         error.name === 'NS_ERROR_DOM_QUOTA_REACHED' || // Firefox
         error.code === 22); // Legacy browsers

      if (isQuotaError) {
        const quotaError = new StorageQuotaError(key, error);
        console.error('localStorage quota exceeded:', quotaError);

        if (options?.throwOnQuotaError) {
          throw quotaError;
        }

        return { success: false, error: quotaError };
      }

      // For non-quota errors, log and return failure
      console.error('Failed to save to localStorage:', error);
      return { success: false };
    }
  },

  remove: (key: string): void => {
    localStorage.removeItem(STORAGE_PREFIX + key);
  },
};
