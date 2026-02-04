import { supabase } from '../lib/supabase';

const STORAGE_PREFIX = 'kanban_';

/**
 * Clears all application state and reloads the page.
 * This is a recovery mechanism for when the app gets into a broken state
 * (e.g., corrupted localStorage, stale auth tokens, infinite loading).
 *
 * What this clears:
 * - Supabase auth session (signs out)
 * - All localStorage items with our app prefix
 * - Forces a full page reload
 */
export async function clearAllStateAndReload(): Promise<void> {
  try {
    // Sign out from Supabase (clears auth tokens)
    await supabase.auth.signOut();
  } catch (error) {
    // Continue even if sign out fails - we're in recovery mode
    console.warn('Sign out failed during recovery:', error);
  }

  // Clear all localStorage items with our prefix
  clearAppLocalStorage();

  // Force reload the page
  window.location.reload();
}

/**
 * Clears only localStorage items related to this application.
 * Does not affect auth state or trigger a reload.
 */
export function clearAppLocalStorage(): void {
  try {
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn(`Failed to remove localStorage key "${key}":`, error);
      }
    });
  } catch (error) {
    // localStorage may be completely inaccessible in some edge cases
    console.warn('Failed to clear localStorage:', error);
  }
}

/**
 * Clears Supabase auth state without reloading.
 * Useful when auth is in a corrupted/stuck state.
 */
export async function clearAuthState(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch (error) {
    console.warn('Sign out failed:', error);
  }

  // Also clear any Supabase-related localStorage items
  try {
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn(`Failed to remove localStorage key "${key}":`, error);
      }
    });
  } catch (error) {
    console.warn('Failed to clear Supabase localStorage:', error);
  }
}

/**
 * Creates a promise that rejects after a specified timeout.
 * Useful for adding timeouts to async operations.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = 'Operation timed out'
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);

    promise
      .then(result => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch(error => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}
