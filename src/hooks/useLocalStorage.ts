import { useState, useCallback, useEffect, useRef } from 'react';
import { storage, StorageQuotaError } from '../utils/storage';

export interface UseLocalStorageOptions {
  /**
   * If true, throws StorageQuotaError when localStorage quota is exceeded.
   * If false (default), fails silently and returns the previous value.
   */
  throwOnQuotaError?: boolean;
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options?: UseLocalStorageOptions
) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    return storage.get(key, initialValue);
  });

  // Track the current value in a ref to avoid stale closures in the storage event handler
  const currentValueRef = useRef(storedValue);

  // Track the key in a ref to avoid re-subscribing on every render
  const keyRef = useRef(key);

  // Update refs in an effect to avoid accessing during render
  useEffect(() => {
    currentValueRef.current = storedValue;
  }, [storedValue]);

  useEffect(() => {
    keyRef.current = key;
  }, [key]);

  // Cross-tab synchronization via storage event
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      // Only handle changes to our specific key
      const changedKey = event.key ? storage.parseKey(event.key) : null;
      if (changedKey !== keyRef.current) {
        return;
      }

      // Key was removed in another tab
      if (event.newValue === null) {
        setStoredValue(initialValue);
        return;
      }

      try {
        const newValue = JSON.parse(event.newValue) as T;
        // Only update if the value actually changed (avoid unnecessary re-renders)
        if (JSON.stringify(newValue) !== JSON.stringify(currentValueRef.current)) {
          setStoredValue(newValue);
        }
      } catch {
        // If parsing fails, ignore the change
        console.warn(`Failed to parse storage event value for key "${key}"`);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key, initialValue]);

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    setStoredValue(prev => {
      const valueToStore = value instanceof Function ? value(prev) : value;
      const result = storage.set(keyRef.current, valueToStore, {
        throwOnQuotaError: options?.throwOnQuotaError,
      });

      if (!result.success) {
        // If storage failed (e.g., quota exceeded), keep the previous value in state
        // unless throwOnQuotaError is true (in which case an error was already thrown)
        console.warn(`Failed to persist value for key "${keyRef.current}" to localStorage`);
        return prev;
      }

      return valueToStore;
    });
  }, [options?.throwOnQuotaError]);

  return [storedValue, setValue] as const;
}

// Re-export the error type for consumers who want to catch it
export { StorageQuotaError };
