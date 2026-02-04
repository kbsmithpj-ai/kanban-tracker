import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '../../../types/task';
import { getCategoryConfig } from '../../../constants/categories';
import { Avatar } from '../../common/Avatar';
import { Badge } from '../../common/Badge';
import { formatDateShort, isPastDue } from '../../../utils/date';
import styles from './TaskCard.module.css';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
}

const priorityColors = {
  low: 'var(--color-priority-low)',
  medium: 'var(--color-priority-medium)',
  high: 'var(--color-priority-high)',
  urgent: 'var(--color-priority-urgent)',
};

export function TaskCard({ task, onClick }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const category = getCategoryConfig(task.category);
  const isOverdue = isPastDue(task.dueDate);

  // Handle click while preventing drag interference
  const handleClick = () => {
    // Only trigger click if not dragging
    if (!isDragging) {
      onClick();
    }
  };

  // Handle keyboard activation for accessibility
  // Only handle Enter key - let space bar behavior remain natural for scrolling
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, borderLeftColor: category.primaryColor }}
      className={`${styles.taskCard} ${styles.categoryBorder} ${isDragging ? styles.dragging : ''}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={`Task: ${task.title}. Priority: ${task.priority}. Category: ${category.label}.${isOverdue ? ' Overdue.' : ''}`}
      {...attributes}
      {...listeners}
    >
      <div className={styles.header}>
        <h4 className={styles.title}>{task.title}</h4>
        <div
          className={styles.priority}
          style={{ backgroundColor: priorityColors[task.priority] }}
          title={`Priority: ${task.priority}`}
          aria-hidden="true"
        />
      </div>

      <div className={styles.meta}>
        <Badge
          color={category.borderColor}
          backgroundColor={category.backgroundColor}
          borderColor={category.borderColor}
        >
          {category.label}
        </Badge>

        {task.dueDate && (
          <span
            className={`${styles.dueDate} ${isOverdue ? styles.overdue : ''}`}
            aria-label={`Due date: ${formatDateShort(task.dueDate)}${isOverdue ? ', overdue' : ''}`}
          >
            <span aria-hidden="true">📅</span> {formatDateShort(task.dueDate)}
          </span>
        )}

        <Avatar memberId={task.assigneeId} size="small" />
      </div>
    </div>
  );
}
