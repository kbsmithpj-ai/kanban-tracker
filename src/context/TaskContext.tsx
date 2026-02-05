/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useCallback, useMemo, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { nanoid } from 'nanoid';
import type { Task, TaskStatus } from '../types/task';
import type { Database, TaskStatus as DbTaskStatus } from '../types/database';
import { isPastDue } from '../utils/date';
import { supabase } from '../lib/supabase';
import { logError } from '../utils/errorLogger';

type DbTask = Database['public']['Tables']['tasks']['Row'];
type DbTaskInsert = Database['public']['Tables']['tasks']['Insert'];
type DbTaskUpdate = Database['public']['Tables']['tasks']['Update'];

interface TaskContextValue {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'order'>) => Promise<Task>;
  updateTask: (id: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  moveTask: (id: string, newStatus: TaskStatus, newOrder: number) => Promise<void>;
  reorderTasks: (taskId: string, newOrder: number) => Promise<void>;
  getTasksByStatus: (status: TaskStatus) => Task[];
  getEffectiveStatus: (task: Task) => TaskStatus;
}

const TaskContext = createContext<TaskContextValue | null>(null);

/**
 * Transforms a database task row (snake_case) to a Task object (camelCase).
 */
function dbToTask(row: DbTask): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    category: row.category,
    priority: row.priority,
    assigneeId: row.assignee_id,
    dueDate: row.due_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    order: row.order,
  };
}

/**
 * Transforms a Task object (camelCase) to database insert format (snake_case).
 * Note: 'past-due' status is computed client-side and should never be stored.
 */
function taskToDbInsert(
  task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'order'>
): DbTaskInsert {
  // Normalize past-due to planning since past-due is a computed status
  const dbStatus: DbTaskStatus = task.status === 'past-due' ? 'planning' : task.status;

  return {
    title: task.title,
    description: task.description,
    status: dbStatus,
    category: task.category,
    priority: task.priority,
    assignee_id: task.assigneeId,
    due_date: task.dueDate,
  };
}

export function TaskProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getEffectiveStatus = useCallback((task: Task): TaskStatus => {
    // Auto-detect past-due: if task has a due date in the past and isn't completed
    if (task.status !== 'completed' && isPastDue(task.dueDate)) {
      return 'past-due';
    }
    return task.status;
  }, []);

  const fetchTasks = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .order('order')
        .returns<DbTask[]>();

      if (fetchError) throw fetchError;

      setTasks((data ?? []).map(dbToTask));
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch tasks';
      setError(message);
      console.error('Failed to fetch tasks:', err);
      logError('Failed to fetch tasks', { error: err, context: { operation: 'fetchTasks' } });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch tasks on mount and subscribe to real-time changes
  useEffect(() => {
    fetchTasks();

    const channel = supabase
      .channel('tasks_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        () => {
          // Refetch on any change to keep state in sync
          fetchTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTasks]);

  const addTask = useCallback(
    async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'order'>): Promise<Task> => {
      const tempId = nanoid();
      const now = new Date().toISOString();

      // Calculate order optimistically from current state
      const tasksInStatus = tasks.filter(t => getEffectiveStatus(t) === taskData.status);
      const maxOrder = tasksInStatus.length > 0
        ? Math.max(...tasksInStatus.map(t => t.order))
        : -1;

      const optimisticTask: Task = {
        ...taskData,
        id: tempId,
        createdAt: now,
        updatedAt: now,
        order: maxOrder + 1,
      };

      // Optimistic update
      setTasks(prev => [...prev, optimisticTask]);

      try {
        const { data, error: insertError } = await supabase
          .from('tasks')
          .insert(taskToDbInsert(taskData))
          .select()
          .single()
          .returns<DbTask>();

        if (insertError) throw insertError;
        if (!data) throw new Error('No data returned from insert');

        // Replace optimistic task with the real one from the database
        const realTask = dbToTask(data);
        setTasks(prev => prev.map(t => t.id === tempId ? realTask : t));
        return realTask;
      } catch (err) {
        // Rollback optimistic update
        setTasks(prev => prev.filter(t => t.id !== tempId));
        const message = err instanceof Error ? err.message : 'Failed to add task';
        console.error('Failed to add task:', err);
        logError('Failed to add task', {
          error: err,
          context: {
            operation: 'addTask',
            taskData: { title: taskData.title, status: taskData.status, category: taskData.category },
          },
        });
        throw new Error(message);
      }
    },
    [tasks, getEffectiveStatus]
  );

  const updateTask = useCallback(
    async (id: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>) => {
      const originalTask = tasks.find(t => t.id === id);
      if (!originalTask) return;

      // Optimistic update
      setTasks(prev =>
        prev.map(task =>
          task.id === id
            ? { ...task, ...updates, updatedAt: new Date().toISOString() }
            : task
        )
      );

      try {
        // Build the database update object, transforming camelCase to snake_case
        const dbUpdates: DbTaskUpdate = {};

        if (updates.title !== undefined) dbUpdates.title = updates.title;
        if (updates.description !== undefined) dbUpdates.description = updates.description;
        if (updates.status !== undefined) {
          // Normalize past-due to the original stored status
          dbUpdates.status = updates.status === 'past-due'
            ? originalTask.status as DbTaskStatus
            : updates.status as DbTaskStatus;
        }
        if (updates.category !== undefined) dbUpdates.category = updates.category;
        if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
        if (updates.assigneeId !== undefined) dbUpdates.assignee_id = updates.assigneeId;
        if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
        if (updates.order !== undefined) dbUpdates.order = updates.order;

        const { error: updateError } = await supabase
          .from('tasks')
          .update(dbUpdates)
          .eq('id', id);

        if (updateError) throw updateError;
      } catch (err) {
        // Rollback optimistic update
        setTasks(prev => prev.map(t => t.id === id ? originalTask : t));
        const message = err instanceof Error ? err.message : 'Failed to update task';
        console.error('Failed to update task:', err);
        logError('Failed to update task', {
          error: err,
          context: {
            operation: 'updateTask',
            taskId: id,
            updates: Object.keys(updates),
          },
        });
        throw new Error(message);
      }
    },
    [tasks]
  );

  const deleteTask = useCallback(
    async (id: string) => {
      const originalTasks = tasks;
      const taskToDelete = tasks.find(t => t.id === id);
      if (!taskToDelete) return;

      // Optimistic update
      setTasks(prev => prev.filter(task => task.id !== id));

      try {
        const { error: deleteError } = await supabase
          .from('tasks')
          .delete()
          .eq('id', id);

        if (deleteError) throw deleteError;
      } catch (err) {
        // Rollback optimistic update
        setTasks(originalTasks);
        const message = err instanceof Error ? err.message : 'Failed to delete task';
        console.error('Failed to delete task:', err);
        logError('Failed to delete task', {
          error: err,
          context: {
            operation: 'deleteTask',
            taskId: id,
          },
        });
        throw new Error(message);
      }
    },
    [tasks]
  );

  const moveTask = useCallback(
    async (id: string, newStatus: TaskStatus, newOrder: number) => {
      const originalTasks = tasks;
      const taskToMove = tasks.find(t => t.id === id);
      if (!taskToMove) return;

      // Calculate the new state optimistically
      // Get tasks in the target status (excluding the task being moved)
      const tasksInNewStatus = tasks
        .filter(t => t.id !== id && getEffectiveStatus(t) === newStatus)
        .sort((a, b) => a.order - b.order);

      // Normalize past-due to a storable status
      const dbStatus: DbTaskStatus = newStatus === 'past-due' ? 'planning' : newStatus as DbTaskStatus;

      // Insert at the new position and reorder
      const updatedTasksInStatus = [
        ...tasksInNewStatus.slice(0, newOrder),
        { ...taskToMove, status: dbStatus, updatedAt: new Date().toISOString() },
        ...tasksInNewStatus.slice(newOrder),
      ].map((t, idx) => ({ ...t, order: idx }));

      // Merge back with tasks from other statuses
      const otherTasks = tasks.filter(
        t => t.id !== id && getEffectiveStatus(t) !== newStatus
      );

      const updatedTasks = [...otherTasks, ...updatedTasksInStatus];

      // Optimistic update
      setTasks(updatedTasks);

      try {
        // Find all tasks that need updating (changed order or status)
        const tasksToUpdate = updatedTasksInStatus.filter(updatedTask => {
          const original = originalTasks.find(o => o.id === updatedTask.id);
          return (
            !original ||
            original.order !== updatedTask.order ||
            original.status !== updatedTask.status
          );
        });

        // Batch update all affected tasks
        await Promise.all(
          tasksToUpdate.map(task => {
            const updateData: DbTaskUpdate = {
              status: task.status as DbTaskStatus,
              order: task.order,
            };
            return supabase
              .from('tasks')
              .update(updateData)
              .eq('id', task.id);
          })
        );
      } catch (err) {
        // Rollback optimistic update
        setTasks(originalTasks);
        const message = err instanceof Error ? err.message : 'Failed to move task';
        console.error('Failed to move task:', err);
        logError('Failed to move task', {
          error: err,
          context: {
            operation: 'moveTask',
            taskId: id,
            newStatus,
            newOrder,
          },
        });
        throw new Error(message);
      }
    },
    [tasks, getEffectiveStatus]
  );

  const reorderTasks = useCallback(
    async (taskId: string, newOrder: number) => {
      const originalTasks = tasks;
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      const status = getEffectiveStatus(task);
      const tasksInStatus = tasks
        .filter(t => getEffectiveStatus(t) === status)
        .sort((a, b) => a.order - b.order);

      const currentIndex = tasksInStatus.findIndex(t => t.id === taskId);
      if (currentIndex === -1 || currentIndex === newOrder) return;

      // Remove and reinsert
      const reordered = [...tasksInStatus];
      const [removed] = reordered.splice(currentIndex, 1);
      reordered.splice(newOrder, 0, removed);

      // Update orders
      const updatedTasksInStatus = reordered.map((t, idx) => ({
        ...t,
        order: idx,
        updatedAt: t.id === taskId ? new Date().toISOString() : t.updatedAt,
      }));

      // Merge back with tasks from other statuses
      const otherTasks = tasks.filter(t => getEffectiveStatus(t) !== status);
      const updatedTasks = [...otherTasks, ...updatedTasksInStatus];

      // Optimistic update
      setTasks(updatedTasks);

      try {
        // Find all tasks whose order changed
        const tasksToUpdate = updatedTasksInStatus.filter(updatedTask => {
          const original = originalTasks.find(o => o.id === updatedTask.id);
          return !original || original.order !== updatedTask.order;
        });

        // Batch update all affected tasks
        await Promise.all(
          tasksToUpdate.map(t => {
            const updateData: DbTaskUpdate = { order: t.order };
            return supabase
              .from('tasks')
              .update(updateData)
              .eq('id', t.id);
          })
        );
      } catch (err) {
        // Rollback optimistic update
        setTasks(originalTasks);
        const message = err instanceof Error ? err.message : 'Failed to reorder tasks';
        console.error('Failed to reorder tasks:', err);
        logError('Failed to reorder tasks', {
          error: err,
          context: {
            operation: 'reorderTasks',
            taskId,
            newOrder,
          },
        });
        throw new Error(message);
      }
    },
    [tasks, getEffectiveStatus]
  );

  const getTasksByStatus = useCallback(
    (status: TaskStatus): Task[] => {
      return tasks
        .filter(task => getEffectiveStatus(task) === status)
        .sort((a, b) => a.order - b.order);
    },
    [tasks, getEffectiveStatus]
  );

  const value = useMemo(
    () => ({
      tasks,
      isLoading,
      error,
      addTask,
      updateTask,
      deleteTask,
      moveTask,
      reorderTasks,
      getTasksByStatus,
      getEffectiveStatus,
    }),
    [
      tasks,
      isLoading,
      error,
      addTask,
      updateTask,
      deleteTask,
      moveTask,
      reorderTasks,
      getTasksByStatus,
      getEffectiveStatus,
    ]
  );

  return (
    <TaskContext.Provider value={value}>
      {children}
    </TaskContext.Provider>
  );
}

export function useTasks() {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
}
