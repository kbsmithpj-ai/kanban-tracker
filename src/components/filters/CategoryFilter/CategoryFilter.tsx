import { CATEGORIES } from '../../../constants/categories';
import { useFilters } from '../../../hooks/useFilters';
import styles from './CategoryFilter.module.css';

export function CategoryFilter() {
  const { filters, toggleCategory } = useFilters();

  return (
    <div className={styles.container}>
      <span className={styles.label}>Category</span>
      <div className={styles.chips}>
        {CATEGORIES.map(category => {
          const isSelected = filters.categories.includes(category.id);
          return (
            <button
              key={category.id}
              className={`${styles.chip} ${isSelected ? styles.selected : ''}`}
              style={{
                borderColor: category.primaryColor,
                backgroundColor: isSelected ? category.backgroundColor : 'var(--color-white)',
                color: category.borderColor,
              }}
              onClick={() => toggleCategory(category.id)}
              aria-pressed={isSelected}
            >
              {category.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
