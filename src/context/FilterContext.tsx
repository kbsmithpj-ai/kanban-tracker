/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { FilterState } from '../types/filter';
import type { TaskCategory, TaskStatus } from '../types/task';
import { useLocalStorage } from '../hooks/useLocalStorage';

const defaultFilterState: FilterState = {
  assigneeId: null,
  categories: [],
  statuses: [],
  searchQuery: '',
};

interface FilterContextValue {
  filters: FilterState;
  setAssignee: (assigneeId: string | null) => void;
  toggleCategory: (category: TaskCategory) => void;
  toggleStatus: (status: TaskStatus) => void;
  setSearchQuery: (query: string) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
}

const FilterContext = createContext<FilterContextValue | null>(null);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useLocalStorage<FilterState>('filters', defaultFilterState);

  const setAssignee = useCallback((assigneeId: string | null) => {
    setFilters(prev => ({ ...prev, assigneeId }));
  }, [setFilters]);

  const toggleCategory = useCallback((category: TaskCategory) => {
    setFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category],
    }));
  }, [setFilters]);

  const toggleStatus = useCallback((status: TaskStatus) => {
    setFilters(prev => ({
      ...prev,
      statuses: prev.statuses.includes(status)
        ? prev.statuses.filter(s => s !== status)
        : [...prev.statuses, status],
    }));
  }, [setFilters]);

  const setSearchQuery = useCallback((searchQuery: string) => {
    setFilters(prev => ({ ...prev, searchQuery }));
  }, [setFilters]);

  const clearFilters = useCallback(() => {
    setFilters(defaultFilterState);
  }, [setFilters]);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.assigneeId !== null ||
      filters.categories.length > 0 ||
      filters.statuses.length > 0 ||
      filters.searchQuery !== ''
    );
  }, [filters]);

  const value = useMemo(() => ({
    filters,
    setAssignee,
    toggleCategory,
    toggleStatus,
    setSearchQuery,
    clearFilters,
    hasActiveFilters,
  }), [filters, setAssignee, toggleCategory, toggleStatus, setSearchQuery, clearFilters, hasActiveFilters]);

  return (
    <FilterContext.Provider value={value}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useFilters must be used within a FilterProvider');
  }
  return context;
}
