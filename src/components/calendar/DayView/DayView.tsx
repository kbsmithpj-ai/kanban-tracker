import { useMemo } from 'react';
import { format } from 'date-fns';
import { useUI } from '../../../context';
import { useFilteredTasks } from '../../../hooks/useFilteredTasks';
import { useTasks } from '../../../hooks/useTasks';
import { getCategoryConfig } from '../../../constants/categories';
import { getStatusConfig } from '../../../constants/statuses';
import { Avatar } from '../../common/Avatar';
import { Badge } from '../../common/Badge';
import styles from './DayView.module.css';

// Priority color mapping for visual indicator (Confluence Genetics brand-aligned)
const priorityColors: Record<string, string> = {
  low: 'var(--color-priority-low, #7a8ba3)',
  medium: 'var(--color-priority-medium, #f5b800)',
  high: 'var(--color-priority-high, #e07040)',
  urgent: 'var(--color-priority-urgent, #e05252)',
};

// Priority labels for accessibility
const priorityLabels: Record<string, string> = {
  low: 'Low priority',
  medium: 'Medium priority',
  high: 'High priority',
  urgent: 'Urgent priority',
};

/**
 * DayView - Detailed view of tasks for a single day
 * Shows full task details including description, status, and priority
 * Provides empty state with option to add a new task
 */
export function DayView() {
  const { selectedDate, openTaskModal } = useUI();
  const { filteredTasks } = useFilteredTasks();
  const { getEffectiveStatus } = useTasks();

  // Filter tasks for the selected day
  const dayTasks = useMemo(() => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return filteredTasks.filter(task => task.dueDate === dateKey);
  }, [selectedDate, filteredTasks]);

  const handleTaskClick = (taskId: string) => {
    openTaskModal(taskId);
  };

  const handleTaskKeyDown = (e: React.KeyboardEvent, taskId: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleTaskClick(taskId);
    }
  };

  const handleAddTask = () => {
    openTaskModal(null);
  };

  // Empty state when no tasks are scheduled
  if (dayTasks.length === 0) {
    return (
      <div className={styles.dayView}>
        <div className={styles.emptyState} role="status">
          <div className={styles.emptyIcon} aria-hidden="true">
            {/* Calendar icon placeholder */}
            <span role="img" aria-label="">📅</span>
          </div>
          <p className={styles.emptyText}>No tasks scheduled for this day</p>
          <button
            className={styles.addButton}
            onClick={handleAddTask}
            aria-label="Add a new task"
          >
            Add Task
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.dayView}>
      <div
        className={styles.taskList}
        role="list"
        aria-label={`Tasks for ${format(selectedDate, 'EEEE, MMMM d, yyyy')}`}
      >
        {dayTasks.map(task => {
          const category = getCategoryConfig(task.category);
          const effectiveStatus = getEffectiveStatus(task);
          const status = getStatusConfig(effectiveStatus);

          return (
            <article
              key={task.id}
              className={styles.taskCard}
              style={{ borderLeftColor: category.primaryColor }}
              onClick={() => handleTaskClick(task.id)}
              onKeyDown={(e) => handleTaskKeyDown(e, task.id)}
              role="listitem"
              tabIndex={0}
              aria-label={`Task: ${task.title}`}
            >
              <div className={styles.taskHeader}>
                <h3 className={styles.taskTitle}>{task.title}</h3>
                <div
                  className={styles.priority}
                  style={{ backgroundColor: priorityColors[task.priority] }}
                  title={priorityLabels[task.priority]}
                  aria-label={priorityLabels[task.priority]}
                />
              </div>

              {task.description && (
                <p className={styles.taskDescription}>{task.description}</p>
              )}

              <div className={styles.taskMeta}>
                <Badge
                  color={category.borderColor}
                  backgroundColor={category.backgroundColor}
                  borderColor={category.borderColor}
                >
                  {category.label}
                </Badge>
                <Badge
                  color={status.primaryColor}
                  backgroundColor={status.backgroundColor}
                >
                  {status.label}
                </Badge>
                <div className={styles.metaItem}>
                  <Avatar memberId={task.assigneeId} size="small" />
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
