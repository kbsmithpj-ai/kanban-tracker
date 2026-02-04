import { STATUSES } from '../../../constants/statuses';
import { useFilters } from '../../../hooks/useFilters';
import styles from './StatusFilter.module.css';

export function StatusFilter() {
  const { filters, toggleStatus } = useFilters();

  return (
    <div className={styles.container}>
      <span className={styles.label}>Status</span>
      <div className={styles.chips}>
        {STATUSES.map(status => {
          const isSelected = filters.statuses.includes(status.id);
          return (
            <button
              key={status.id}
              className={`${styles.chip} ${isSelected ? styles.selected : ''}`}
              style={{
                backgroundColor: isSelected ? status.backgroundColor : 'var(--color-white)',
                borderColor: isSelected ? status.primaryColor : 'var(--nb-border-color)',
              }}
              onClick={() => toggleStatus(status.id)}
              aria-pressed={isSelected}
            >
              {status.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
