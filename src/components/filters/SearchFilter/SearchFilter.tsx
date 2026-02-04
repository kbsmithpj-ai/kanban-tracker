import { useState, useEffect, useRef } from 'react';
import { useFilters } from '../../../hooks/useFilters';
import styles from './SearchFilter.module.css';

const DEBOUNCE_DELAY_MS = 300;

export function SearchFilter() {
  const { filters, setSearchQuery } = useFilters();

  // Local state for immediate input responsiveness
  const [localQuery, setLocalQuery] = useState(filters.searchQuery);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track the previous context value to detect external changes (e.g., "Clear All" button)
  const prevSearchQueryRef = useRef(filters.searchQuery);

  // Debounce the context update and handle external changes
  useEffect(() => {
    // Check if the context value changed externally (e.g., "Clear All" button)
    const externalChange = prevSearchQueryRef.current !== filters.searchQuery;
    if (externalChange) {
      prevSearchQueryRef.current = filters.searchQuery;
      // Sync local state to external change without triggering debounce
      // This is intentional - we need to sync external state changes to local state
      if (localQuery !== filters.searchQuery) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional sync from external prop change
        setLocalQuery(filters.searchQuery);
      }
      return;
    }

    // Clear any pending timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Skip if local state matches context (avoids redundant updates)
    if (localQuery === filters.searchQuery) {
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      setSearchQuery(localQuery);
      prevSearchQueryRef.current = localQuery;
    }, DEBOUNCE_DELAY_MS);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [localQuery, filters.searchQuery, setSearchQuery]);

  const handleClear = () => {
    setLocalQuery('');
    setSearchQuery('');
    // Clear any pending debounce since we're updating immediately
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
  };

  return (
    <div className={styles.container}>
      <label className={styles.label} htmlFor="search-filter">
        Search
      </label>
      <div className={styles.inputWrapper}>
        <span className={styles.icon} aria-hidden="true">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </span>
        <input
          id="search-filter"
          type="text"
          className={styles.input}
          placeholder="Search tasks..."
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
        />
        {localQuery && (
          <button
            type="button"
            className={styles.clearButton}
            onClick={handleClear}
            aria-label="Clear search"
          >
            x
          </button>
        )}
      </div>
    </div>
  );
}
