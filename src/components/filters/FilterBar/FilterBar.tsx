import { useFilters } from '../../../hooks/useFilters';
import { useFilteredTasks } from '../../../hooks/useFilteredTasks';
import { CategoryFilter } from '../CategoryFilter';
import { StatusFilter } from '../StatusFilter';
import { AssigneeFilter } from '../AssigneeFilter';
import { SearchFilter } from '../SearchFilter';
import styles from './FilterBar.module.css';

export function FilterBar() {
  const { filters, clearFilters, hasActiveFilters } = useFilters();
  const { totalCount, filteredCount } = useFilteredTasks();

  const activeFilterCount =
    (filters.assigneeId ? 1 : 0) +
    filters.categories.length +
    filters.statuses.length +
    (filters.searchQuery ? 1 : 0);

  return (
    <div className={styles.filterBar}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          Filters
          {activeFilterCount > 0 && (
            <span className={styles.filterCount}>{activeFilterCount}</span>
          )}
        </h3>
        {hasActiveFilters && (
          <button className={styles.clearButton} onClick={clearFilters}>
            Clear All
          </button>
        )}
      </div>

      <div className={styles.filters}>
        <SearchFilter />
        <AssigneeFilter />
        <div className={styles.fullWidth}>
          <CategoryFilter />
        </div>
        <div className={styles.fullWidth}>
          <StatusFilter />
        </div>
      </div>

      {hasActiveFilters && (
        <div className={styles.resultCount}>
          Showing {filteredCount} of {totalCount} tasks
        </div>
      )}
    </div>
  );
}
