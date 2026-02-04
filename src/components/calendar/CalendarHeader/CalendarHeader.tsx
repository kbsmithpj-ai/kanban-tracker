import { format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays } from 'date-fns';
import { useUI } from '../../../context';
import styles from './CalendarHeader.module.css';

/**
 * CalendarHeader - Shared navigation component for calendar views
 * Provides navigation controls (prev/next/today) and date display
 * Adapts navigation granularity based on current view mode (month/week/day)
 */
export function CalendarHeader() {
  const { viewMode, selectedDate, setSelectedDate } = useUI();

  const handlePrev = () => {
    switch (viewMode) {
      case 'month':
        setSelectedDate(subMonths(selectedDate, 1));
        break;
      case 'week':
        setSelectedDate(subWeeks(selectedDate, 1));
        break;
      case 'day':
        setSelectedDate(subDays(selectedDate, 1));
        break;
    }
  };

  const handleNext = () => {
    switch (viewMode) {
      case 'month':
        setSelectedDate(addMonths(selectedDate, 1));
        break;
      case 'week':
        setSelectedDate(addWeeks(selectedDate, 1));
        break;
      case 'day':
        setSelectedDate(addDays(selectedDate, 1));
        break;
    }
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  const getDateDisplay = (): string => {
    switch (viewMode) {
      case 'month':
        return format(selectedDate, 'MMMM yyyy');
      case 'week':
        return format(selectedDate, "'Week of' MMM d, yyyy");
      case 'day':
        return format(selectedDate, 'EEEE, MMMM d, yyyy');
      default:
        return '';
    }
  };

  const getPrevLabel = (): string => {
    switch (viewMode) {
      case 'month':
        return 'Previous month';
      case 'week':
        return 'Previous week';
      case 'day':
        return 'Previous day';
      default:
        return 'Previous';
    }
  };

  const getNextLabel = (): string => {
    switch (viewMode) {
      case 'month':
        return 'Next month';
      case 'week':
        return 'Next week';
      case 'day':
        return 'Next day';
      default:
        return 'Next';
    }
  };

  // Don't render for kanban view
  if (viewMode === 'kanban') return null;

  return (
    <header className={styles.header} role="navigation" aria-label="Calendar navigation">
      <button
        className={styles.todayButton}
        onClick={handleToday}
        aria-label="Go to today"
      >
        Today
      </button>
      <div className={styles.navigation}>
        <button
          className={styles.navButton}
          onClick={handlePrev}
          aria-label={getPrevLabel()}
        >
          <span aria-hidden="true">&larr;</span>
        </button>
        <span className={styles.dateDisplay} aria-live="polite">
          {getDateDisplay()}
        </span>
        <button
          className={styles.navButton}
          onClick={handleNext}
          aria-label={getNextLabel()}
        >
          <span aria-hidden="true">&rarr;</span>
        </button>
      </div>
      {/* Spacer for visual alignment with Today button */}
      <div className={styles.spacer} aria-hidden="true" />
    </header>
  );
}
