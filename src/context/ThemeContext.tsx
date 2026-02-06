/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';

/** Storage key for persisting theme preference */
const THEME_STORAGE_KEY = 'kanban-theme';

/** Available theme options */
export type Theme = 'light' | 'dark';

interface ThemeContextValue {
  /** Current active theme */
  theme: Theme;
  /** Toggle between light and dark themes */
  toggleTheme: () => void;
  /** Explicitly set a specific theme */
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * Retrieves the initial theme from localStorage or system preference.
 * Priority:
 * 1. localStorage value (user's explicit choice)
 * 2. System preference via prefers-color-scheme
 * 3. Default to 'light'
 */
function getInitialTheme(): Theme {
  // Check localStorage first for persisted preference
  if (typeof window !== 'undefined') {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme === 'light' || storedTheme === 'dark') {
      return storedTheme;
    }

    // Fall back to system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  }

  // Default to light theme
  return 'light';
}

/**
 * Applies the theme to the document by setting the data-theme attribute.
 * This allows CSS to respond to theme changes via [data-theme="dark"] selectors.
 */
function applyThemeToDocument(theme: Theme): void {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  /**
   * Apply theme to document on initial load and whenever theme changes.
   * This effect ensures the DOM attribute stays in sync with React state.
   */
  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  /**
   * Listen for system preference changes and update theme if user hasn't
   * explicitly set a preference (i.e., no localStorage value).
   */
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleSystemThemeChange = (event: MediaQueryListEvent) => {
      // Only respond to system changes if user hasn't set explicit preference
      const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      if (!storedTheme) {
        const newTheme: Theme = event.matches ? 'dark' : 'light';
        setThemeState(newTheme);
      }
    };

    // Modern browsers use addEventListener, older ones use addListener
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemThemeChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleSystemThemeChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleSystemThemeChange);
      } else {
        mediaQuery.removeListener(handleSystemThemeChange);
      }
    };
  }, []);

  /**
   * Toggles between light and dark themes.
   * Persists the new preference to localStorage.
   */
  const toggleTheme = useCallback(() => {
    setThemeState((currentTheme) => {
      const newTheme: Theme = currentTheme === 'light' ? 'dark' : 'light';
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
      return newTheme;
    });
  }, []);

  /**
   * Explicitly sets the theme to a specific value.
   * Persists the preference to localStorage.
   */
  const setTheme = useCallback((newTheme: Theme) => {
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    setThemeState(newTheme);
  }, []);

  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    toggleTheme,
    setTheme,
  }), [theme, toggleTheme, setTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
