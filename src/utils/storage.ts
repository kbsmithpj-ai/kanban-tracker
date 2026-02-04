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
    try {
      const item = localStorage.getItem(STORAGE_PREFIX + key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
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
