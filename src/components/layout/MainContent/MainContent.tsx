import { useUI } from '../../../context';
import { KanbanBoard } from '../../kanban';
import { CalendarHeader, MonthView, WeekView, DayView } from '../../calendar';
import styles from './MainContent.module.css';

export function MainContent() {
  const { viewMode } = useUI();

  const renderView = () => {
    switch (viewMode) {
      case 'kanban':
        return <KanbanBoard />;
      case 'month':
        return (
          <>
            <CalendarHeader />
            <MonthView />
          </>
        );
      case 'week':
        return (
          <>
            <CalendarHeader />
            <WeekView />
          </>
        );
      case 'day':
        return (
          <>
            <CalendarHeader />
            <DayView />
          </>
        );
      default:
        return <KanbanBoard />;
    }
  };

  return (
    <main className={styles.main}>
      <div className={styles.viewContainer}>
        {renderView()}
      </div>
    </main>
  );
}
