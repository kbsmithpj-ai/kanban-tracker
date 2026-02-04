import { useCallback, useRef } from 'react';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  pointerWithin,
  rectIntersection,
} from '@dnd-kit/core';
import type { CollisionDetection } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { TaskStatus } from '../../../types/task';
import { STATUSES } from '../../../constants/statuses';
import { useTasks } from '../../../hooks/useTasks';
import { useFilteredTasks } from '../../../hooks/useFilteredTasks';
import { useUI } from '../../../context';
import { KanbanColumn } from '../KanbanColumn';
import styles from './KanbanBoard.module.css';

// Extract status IDs outside component to avoid dependency issues
const STATUS_IDS = STATUSES.map(s => s.id);

// Custom collision detection that prioritizes tasks but falls back to columns
const customCollisionDetection: CollisionDetection = (args) => {
  // First try to find intersecting tasks
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) {
    return pointerCollisions;
  }
  // Fall back to rect intersection for column detection
  return rectIntersection(args);
};

export function KanbanBoard() {
  const { moveTask, getTasksByStatus } = useTasks();
  const { tasksByStatus } = useFilteredTasks();
  const { openTaskModal } = useUI();

  // Track when drag ends to suppress click events
  const dragEndTimeRef = useRef<number>(0);

  // Configure sensors for drag detection
  // PointerSensor requires 8px movement before activating to allow clicks
  // KeyboardSensor enables keyboard-based drag and drop for accessibility
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    // Record drag end time to suppress click events that fire immediately after
    dragEndTimeRef.current = Date.now();

    const { active, over } = event;

    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    // Check if dropped on a column (status)
    const isColumn = STATUS_IDS.includes(overId as TaskStatus);

    if (isColumn) {
      // Dropped directly on a column - append to end of unfiltered task list
      const newStatus = overId as TaskStatus;
      const allTasksInColumn = getTasksByStatus(newStatus);
      moveTask(taskId, newStatus, allTasksInColumn.length);
    } else {
      // Dropped on another task - find which column it belongs to
      // Use unfiltered tasks to get correct insertion index
      for (const status of STATUS_IDS) {
        const allTasks = getTasksByStatus(status);
        const overIndex = allTasks.findIndex(t => t.id === overId);
        if (overIndex !== -1) {
          moveTask(taskId, status, overIndex);
          break;
        }
      }
    }
  }, [moveTask, getTasksByStatus]);

  const handleTaskClick = useCallback((taskId: string) => {
    // Suppress clicks that occur within 150ms of a drag ending
    // This prevents the modal from opening after a short drag
    const timeSinceDragEnd = Date.now() - dragEndTimeRef.current;
    if (timeSinceDragEnd < 150) {
      return;
    }
    openTaskModal(taskId);
  }, [openTaskModal]);

  const handleAddTask = useCallback(() => {
    openTaskModal(null);
  }, [openTaskModal]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      onDragEnd={handleDragEnd}
    >
      <div
        className={styles.board}
        role="region"
        aria-label="Kanban board"
      >
        {STATUSES.map(status => (
          <KanbanColumn
            key={status.id}
            status={status.id}
            tasks={tasksByStatus[status.id]}
            onTaskClick={handleTaskClick}
            onAddTask={handleAddTask}
          />
        ))}
      </div>
    </DndContext>
  );
}
