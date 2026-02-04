import { useUI } from '../../../context';
import type { ViewMode } from '../../../context';
import { UserMenu } from '../../auth';
import styles from './Header.module.css';

const views: { id: ViewMode; label: string }[] = [
  { id: 'kanban', label: 'Board' },
  { id: 'month', label: 'Month' },
  { id: 'week', label: 'Week' },
  { id: 'day', label: 'Day' },
];

export function Header() {
  const { viewMode, setViewMode, openTaskModal } = useUI();

  return (
    <header className={styles.header}>
      <h1 className={styles.logo}>
        Kanban<span className={styles.logoAccent}>Tracker</span>
      </h1>

      <nav className={styles.nav} aria-label="View selection">
        {views.map(view => (
          <button
            key={view.id}
            className={`${styles.viewButton} ${viewMode === view.id ? styles.active : ''}`}
            onClick={() => setViewMode(view.id)}
            aria-pressed={viewMode === view.id}
          >
            {view.label}
          </button>
        ))}
      </nav>

      <div className={styles.actions}>
        <button
          className={styles.addButton}
          onClick={() => openTaskModal(null)}
        >
          <span aria-hidden="true">+</span> New Task
        </button>
        <UserMenu />
      </div>
    </header>
  );
}
