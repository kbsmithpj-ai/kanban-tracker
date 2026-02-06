import { useMemo } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  format,
} from 'date-fns';
import { useUI } from '../../../context';
import { useFilteredTasks } from '../../../hooks/useFilteredTasks';
import { useTasks } from '../../../hooks/useTasks';
import { getCategoryConfig } from '../../../constants/categories';
import { getCalendarDateKey } from '../../../utils/date';
import type { Task } from '../../../types/task';
import styles from './MonthView.module.css';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MAX_VISIBLE_TASKS = 3;

/**
 * MonthView - Calendar grid showing the full month
 * Displays tasks on their due dates with category color coding
 * Clicking a day navigates to the day view
 * Clicking a task opens the task modal
 */
export function MonthView() {
  const { selectedDate, setSelectedDate, setViewMode, openTaskModal } = useUI();
  const { filteredTasks } = useFilteredTasks();
  const { getEffectiveStatus } = useTasks();

  // Memoize today's date to avoid creating new Date objects for every calendar cell
  // This is only recalculated when the component re-renders (typically on user interaction)
  const today = useMemo(() => new Date(), []);

  // Generate array of days for the calendar grid (includes padding days from adjacent months)
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [selectedDate]);

  // Group tasks by date for efficient lookup
  // Completed tasks appear on their completion date; others on their due date
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    filteredTasks.forEach(task => {
      const dateKey = getCalendarDateKey(task);
      if (dateKey) {
        if (!map.has(dateKey)) {
          map.set(dateKey, []);
        }
        map.get(dateKey)!.push(task);
      }
    });
    return map;
  }, [filteredTasks]);

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setViewMode('day');
  };

  const handleDayKeyDown = (e: React.KeyboardEvent, date: Date) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleDayClick(date);
    }
  };

  const handleTaskClick = (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    openTaskModal(taskId);
  };

  const handleTaskKeyDown = (e: React.KeyboardEvent, taskId: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      openTaskModal(taskId);
    }
  };

  return (
    <div className={styles.monthView} role="grid" aria-label="Month calendar">
      {/* Weekday headers */}
      <div className={styles.weekDays} role="row">
        {WEEKDAYS.map(day => (
          <div key={day} className={styles.weekDay} role="columnheader">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className={styles.daysGrid} role="rowgroup">
        {calendarDays.map(day => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayTasks = tasksByDate.get(dateKey) || [];
          const isCurrentMonth = isSameMonth(day, selectedDate);
          const isToday = isSameDay(day, today);

          const cellClasses = [
            styles.dayCell,
            !isCurrentMonth && styles.otherMonth,
            isToday && styles.today,
          ].filter(Boolean).join(' ');

          return (
            <div
              key={dateKey}
              className={cellClasses}
              onClick={() => handleDayClick(day)}
              onKeyDown={(e) => handleDayKeyDown(e, day)}
              role="gridcell"
              tabIndex={0}
              aria-label={`${format(day, 'EEEE, MMMM d, yyyy')}${dayTasks.length > 0 ? `, ${dayTasks.length} tasks` : ''}`}
            >
              <div className={styles.dayHeader}>
                <span className={styles.dayNumber}>{format(day, 'd')}</span>
              </div>
              <div className={styles.taskList}>
                {dayTasks.slice(0, MAX_VISIBLE_TASKS).map(task => {
                  const category = getCategoryConfig(task.category);
                  const isCompleted = getEffectiveStatus(task) === 'completed';
                  const taskClasses = [
                    styles.taskItem,
                    isCompleted && styles.completedTask,
                  ].filter(Boolean).join(' ');
                  return (
                    <div
                      key={task.id}
                      className={taskClasses}
                      style={{
                        backgroundColor: category.backgroundColor,
                        borderLeftColor: category.primaryColor,
                      }}
                      onClick={(e) => handleTaskClick(e, task.id)}
                      onKeyDown={(e) => handleTaskKeyDown(e, task.id)}
                      role="button"
                      tabIndex={0}
                      aria-label={`Task: ${task.title}${isCompleted ? ' (completed)' : ''}`}
                    >
                      {isCompleted && <span className={styles.checkmark} aria-hidden="true">&#10003;</span>}
                      <span className={isCompleted ? styles.completedTitle : undefined}>{task.title}</span>
                    </div>
                  );
                })}
                {dayTasks.length > MAX_VISIBLE_TASKS && (
                  <span className={styles.moreCount} aria-label={`${dayTasks.length - MAX_VISIBLE_TASKS} more tasks`}>
                    +{dayTasks.length - MAX_VISIBLE_TASKS} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
