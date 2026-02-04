import { memo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Task, TaskStatus } from '../../../types/task';
import { getStatusConfig } from '../../../constants/statuses';
import { TaskCard } from '../TaskCard';
import styles from './KanbanColumn.module.css';

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: Task[];
  onTaskClick: (taskId: string) => void;
  onAddTask: () => void;
}

/**
 * KanbanColumn - Displays a single column in the Kanban board
 * Wrapped in React.memo to prevent re-renders when sibling columns change.
 * Only re-renders when its own tasks array or callbacks change.
 */
export const KanbanColumn = memo(function KanbanColumn({ status, tasks, onTaskClick, onAddTask }: KanbanColumnProps) {
  const statusConfig = getStatusConfig(status);

  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  return (
    <section
      className={styles.column}
      aria-labelledby={`column-header-${status}`}
    >
      <div
        className={styles.header}
        style={{ backgroundColor: statusConfig.backgroundColor }}
      >
        <div className={styles.headerLeft}>
          <h3
            id={`column-header-${status}`}
            className={styles.title}
          >
            {statusConfig.label}
          </h3>
          <span
            className={styles.count}
            aria-label={`${tasks.length} task${tasks.length !== 1 ? 's' : ''}`}
          >
            {tasks.length}
          </span>
        </div>
        <button
          className={styles.addButton}
          onClick={onAddTask}
          title={`Add task to ${statusConfig.label}`}
          aria-label={`Add task to ${statusConfig.label}`}
        >
          +
        </button>
      </div>

      <div className={styles.content}>
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <div
            ref={setNodeRef}
            className={`${styles.dropArea} ${isOver ? styles.dropAreaOver : ''}`}
            role="list"
            aria-label={`${statusConfig.label} tasks`}
          >
            {tasks.length === 0 ? (
              <div className={styles.emptyState} role="listitem">
                No tasks
              </div>
            ) : (
              tasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onClick={() => onTaskClick(task.id)}
                />
              ))
            )}
          </div>
        </SortableContext>
      </div>
    </section>
  );
});
