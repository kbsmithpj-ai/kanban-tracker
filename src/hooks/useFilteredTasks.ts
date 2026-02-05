import { useMemo } from 'react';
import { useTasks } from '../context/TaskContext';
import { useFilters } from '../context/FilterContext';
import type { Task, TaskStatus } from '../types/task';

/** Pre-computed tasks organized by status for stable references */
export type TasksByStatus = Record<TaskStatus, Task[]>;

export function useFilteredTasks() {
  const { tasks, getEffectiveStatus } = useTasks();
  const { filters } = useFilters();

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Filter by assignee
      if (filters.assigneeId && task.assigneeId !== filters.assigneeId) {
        return false;
      }

      // Filter by category
      if (filters.categories.length > 0 && !filters.categories.includes(task.category)) {
        return false;
      }

      // Filter by status
      if (filters.statuses.length > 0) {
        const effectiveStatus = getEffectiveStatus(task);
        if (!filters.statuses.includes(effectiveStatus)) {
          return false;
        }
      }

      // Filter by search query
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(query);
        const matchesDescription = task.description?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDescription) {
          return false;
        }
      }

      return true;
    });
  }, [tasks, filters, getEffectiveStatus]);

  // Pre-compute tasks by status for stable array references
  // This prevents unnecessary re-renders in child components that consume these arrays
  const tasksByStatus = useMemo<TasksByStatus>(() => {
    // Sort by due date (earliest first), tasks without due date go to bottom
    const sortByDueDate = (a: Task, b: Task) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;  // a goes after b
      if (!b.dueDate) return -1; // a goes before b
      return a.dueDate.localeCompare(b.dueDate);
    };

    const filterAndSort = (status: TaskStatus): Task[] =>
      filteredTasks
        .filter(task => getEffectiveStatus(task) === status)
        .sort(sortByDueDate);

    return {
      'planning': filterAndSort('planning'),
      'in-progress': filterAndSort('in-progress'),
      'completed': filterAndSort('completed'),
      'past-due': filterAndSort('past-due'),
    };
  }, [filteredTasks, getEffectiveStatus]);

  // Legacy function wrapper for backward compatibility
  // Components should prefer using tasksByStatus directly for better performance
  const getFilteredTasksByStatus = useMemo(() => {
    return (status: TaskStatus): Task[] => tasksByStatus[status];
  }, [tasksByStatus]);

  return {
    filteredTasks,
    tasksByStatus,
    getFilteredTasksByStatus,
    totalCount: tasks.length,
    filteredCount: filteredTasks.length,
  };
}
