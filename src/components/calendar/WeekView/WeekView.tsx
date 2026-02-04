import { useMemo } from 'react';
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  format,
} from 'date-fns';
import { useUI } from '../../../context';
import { useFilteredTasks } from '../../../hooks/useFilteredTasks';
import { getCategoryConfig } from '../../../constants/categories';
import { Avatar } from '../../common/Avatar';
import { Badge } from '../../common/Badge';
import type { Task } from '../../../types/task';
import styles from './WeekView.module.css';

/**
 * WeekView - 7-day calendar layout showing tasks in columns
 * Each day column displays tasks due on that date
 * Clicking a day header navigates to the day view
 * Clicking a task opens the task modal
 */
export function WeekView() {
  const { selectedDate, setSelectedDate, setViewMode, openTaskModal } = useUI();
  const { filteredTasks } = useFilteredTasks();

  // Generate array of 7 days for the week
  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(selectedDate);
    const weekEnd = endOfWeek(selectedDate);
    return eachDayOfInterval({ start: weekStart, end: weekEnd });
  }, [selectedDate]);

  // Group tasks by date for efficient lookup
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    filteredTasks.forEach(task => {
      if (task.dueDate) {
        const dateKey = task.dueDate;
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

  const handleTaskClick = (taskId: string) => {
    openTaskModal(taskId);
  };

  const handleTaskKeyDown = (e: React.KeyboardEvent, taskId: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleTaskClick(taskId);
    }
  };

  return (
    <div className={styles.weekView} role="grid" aria-label="Week calendar">
      {/* Day headers */}
      <div className={styles.header} role="row">
        {weekDays.map(day => {
          const isToday = isSameDay(day, new Date());
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayTasks = tasksByDate.get(dateKey) || [];

          return (
            <div
              key={day.toISOString()}
              className={`${styles.dayHeader} ${isToday ? styles.today : ''}`}
              onClick={() => handleDayClick(day)}
              onKeyDown={(e) => handleDayKeyDown(e, day)}
              role="columnheader"
              tabIndex={0}
              aria-label={`${format(day, 'EEEE, MMMM d')}${dayTasks.length > 0 ? `, ${dayTasks.length} tasks` : ''}`}
            >
              <div className={styles.dayName}>{format(day, 'EEE')}</div>
              <div className={styles.dayDate}>{format(day, 'd')}</div>
            </div>
          );
        })}
      </div>

      {/* Day columns with tasks */}
      <div className={styles.content} role="rowgroup">
        {weekDays.map(day => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayTasks = tasksByDate.get(dateKey) || [];

          return (
            <div
              key={dateKey}
              className={styles.dayColumn}
              role="gridcell"
              aria-label={`Tasks for ${format(day, 'EEEE, MMMM d')}`}
            >
              {dayTasks.length === 0 ? (
                <div className={styles.emptyDay}>No tasks</div>
              ) : (
                dayTasks.map(task => {
                  const category = getCategoryConfig(task.category);
                  return (
                    <div
                      key={task.id}
                      className={styles.taskCard}
                      style={{
                        borderLeftColor: category.primaryColor,
                        borderLeftWidth: '4px',
                      }}
                      onClick={() => handleTaskClick(task.id)}
                      onKeyDown={(e) => handleTaskKeyDown(e, task.id)}
                      role="button"
                      tabIndex={0}
                      aria-label={`Task: ${task.title}, Category: ${category.label}`}
                    >
                      <div className={styles.taskTitle}>{task.title}</div>
                      <div className={styles.taskMeta}>
                        <Badge
                          color={category.borderColor}
                          backgroundColor={category.backgroundColor}
                          borderColor={category.borderColor}
                        >
                          {category.label}
                        </Badge>
                        <Avatar memberId={task.assigneeId} size="small" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
