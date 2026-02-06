import { useUI, useAuth, useTheme } from '../../../context';
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
  const { viewMode, setViewMode, openTaskModal, openInviteModal, openErrorLogModal } = useUI();
  const { isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className={styles.header}>
      <div className={styles.branding}>
        <h1 className={styles.teamTitle}>
          <span className={styles.teamTitleAccent}>Pre-Comm</span> Team
        </h1>
        <span className={styles.logo}>
          Kanban<span className={styles.logoAccent}>Tracker</span>
        </span>
      </div>

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
          className={styles.themeToggle}
          onClick={toggleTheme}
          aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          <span aria-hidden="true">{theme === 'light' ? '\u263E' : '\u2600'}</span>
        </button>
        {isAdmin && (
          <button
            className={styles.errorLogsButton}
            onClick={openErrorLogModal}
            aria-label="View error logs"
          >
            <span aria-hidden="true">&#9888;</span> Errors
          </button>
        )}
        {isAdmin && (
          <button
            className={styles.inviteButton}
            onClick={openInviteModal}
            aria-label="Invite team member"
          >
            <span aria-hidden="true">&#9993;</span> Invite
          </button>
        )}
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
