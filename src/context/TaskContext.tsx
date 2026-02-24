/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useCallback, useMemo, useEffect, useState, useRef } from 'react';
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
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'order' | 'completedAt'>) => Promise<Task>;
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
    completedAt: row.completed_at,
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
  task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'order' | 'completedAt'> & { completedAt?: string | null }
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
    completed_at: task.completedAt ?? null,
  };
}

export function TaskProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Midnight tick: forces a re-render at midnight so getEffectiveStatus
  // re-evaluates past-due status for tasks whose due date just elapsed.
  const [midnightTick, setMidnightTick] = useState(0);

  useEffect(() => {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    const timer = setTimeout(() => setMidnightTick(t => t + 1), msUntilMidnight);
    return () => clearTimeout(timer);
  }, [midnightTick]);

  // Fix 1: Track in-flight mutations so real-time subscription does not
  // clobber optimistic state with a stale server snapshot.
  const pendingMutationCount = useRef(0);
  const debouncedRefetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  /**
   * Schedule a refetch that is debounced by 500ms. Called by the real-time
   * handler when mutations are in flight so we get a clean snapshot once
   * all pending writes settle.
   */
  const scheduleDebouncedRefetch = useCallback(() => {
    if (debouncedRefetchTimer.current) {
      clearTimeout(debouncedRefetchTimer.current);
    }
    debouncedRefetchTimer.current = setTimeout(() => {
      debouncedRefetchTimer.current = null;
      fetchTasks();
    }, 500);
  }, [fetchTasks]);

  // Fetch tasks on mount and subscribe to real-time changes
  useEffect(() => {
    fetchTasks();

    const channel = supabase
      .channel('tasks_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        () => {
          // Fix 1: Skip immediate refetch while mutations are in flight to
          // avoid overwriting optimistic state. Schedule a debounced refetch
          // instead so we converge after the last mutation settles.
          if (pendingMutationCount.current > 0) {
            scheduleDebouncedRefetch();
            return;
          }
          fetchTasks();
        }
      )
      // Fix 5: Detect system-level subscription errors
      .on('system', {}, (payload) => {
        console.error('Realtime system event on tasks_changes channel:', payload);
      })
      .subscribe((status, err) => {
        // Fix 5: Detect CHANNEL_ERROR from the subscription callback
        if (status === 'CHANNEL_ERROR') {
          console.error('Realtime CHANNEL_ERROR on tasks_changes:', err);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTasks, scheduleDebouncedRefetch]);

  // Cleanup debounced timer on unmount
  useEffect(() => {
    return () => {
      if (debouncedRefetchTimer.current) {
        clearTimeout(debouncedRefetchTimer.current);
      }
    };
  }, []);

  const addTask = useCallback(
    async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'order' | 'completedAt'>): Promise<Task> => {
      const tempId = nanoid();
      const now = new Date().toISOString();

      // Fix 4: Use functional updater so order computation uses the latest
      // state, avoiding stale closures during rapid sequential adds.
      let optimisticTask: Task | null = null;

      setTasks(prev => {
        const tasksInStatus = prev.filter(t => {
          if (t.status !== 'completed' && isPastDue(t.dueDate)) {
            return 'past-due' === taskData.status;
          }
          return t.status === taskData.status;
        });
        const maxOrder = tasksInStatus.length > 0
          ? Math.max(...tasksInStatus.map(t => t.order))
          : -1;

        optimisticTask = {
          ...taskData,
          id: tempId,
          completedAt: taskData.status === 'completed' ? now : null,
          createdAt: now,
          updatedAt: now,
          order: maxOrder + 1,
        };

        return [...prev, optimisticTask];
      });

      pendingMutationCount.current += 1;
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
      } finally {
        pendingMutationCount.current -= 1;
      }
    },
    []
  );

  const updateTask = useCallback(
    async (id: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>) => {
      const originalTask = tasks.find(t => t.id === id);
      if (!originalTask) return;

      // Compute completedAt for status transitions
      const now = new Date().toISOString();
      const completedAtUpdate: Partial<Pick<Task, 'completedAt'>> = {};
      if (updates.status !== undefined) {
        const effectiveNewStatus = updates.status === 'past-due' ? originalTask.status : updates.status;
        if (effectiveNewStatus === 'completed' && originalTask.status !== 'completed') {
          completedAtUpdate.completedAt = now;
        } else if (effectiveNewStatus !== 'completed' && originalTask.status === 'completed') {
          completedAtUpdate.completedAt = null;
        }
      }

      // Optimistic update
      setTasks(prev =>
        prev.map(task =>
          task.id === id
            ? { ...task, ...updates, ...completedAtUpdate, updatedAt: now }
            : task
        )
      );

      pendingMutationCount.current += 1;
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
        if (completedAtUpdate.completedAt !== undefined) dbUpdates.completed_at = completedAtUpdate.completedAt;

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
      } finally {
        pendingMutationCount.current -= 1;
      }
    },
    [tasks]
  );

  const deleteTask = useCallback(
    async (id: string) => {
      // Fix 3: Capture only the deleted task, not the full snapshot, so
      // rollback does not clobber concurrent mutations to other tasks.
      const taskToDelete = tasks.find(t => t.id === id);
      if (!taskToDelete) return;

      // Optimistic update
      setTasks(prev => prev.filter(task => task.id !== id));

      pendingMutationCount.current += 1;
      try {
        const { error: deleteError } = await supabase
          .from('tasks')
          .delete()
          .eq('id', id);

        if (deleteError) throw deleteError;
      } catch (err) {
        // Fix 3: Targeted rollback -- re-insert only the deleted task if it
        // is not already present (guards against double-rollback).
        setTasks(prev =>
          prev.some(t => t.id === id)
            ? prev
            : [...prev, taskToDelete].sort((a, b) => a.order - b.order)
        );
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
      } finally {
        pendingMutationCount.current -= 1;
      }
    },
    [tasks]
  );

  const moveTask = useCallback(
    async (id: string, newStatus: TaskStatus, newOrder: number) => {
      const taskToMove = tasks.find(t => t.id === id);
      if (!taskToMove) return;

      // Fix 6: Filter other tasks by excluding only the moved task, not by
      // effective status. This prevents past-due tasks from disappearing when
      // the target status is also past-due.
      const otherTasks = tasks.filter(t => t.id !== id);

      // Get tasks in the target status (excluding the task being moved)
      const tasksInNewStatus = otherTasks
        .filter(t => getEffectiveStatus(t) === newStatus)
        .sort((a, b) => a.order - b.order);

      // Normalize past-due to a storable status
      const dbStatus: DbTaskStatus = newStatus === 'past-due' ? 'planning' : newStatus as DbTaskStatus;

      // Compute completedAt for status transition
      const moveNow = new Date().toISOString();
      let movedCompletedAt: string | null = taskToMove.completedAt;
      if (dbStatus === 'completed' && taskToMove.status !== 'completed') {
        movedCompletedAt = moveNow;
      } else if (dbStatus !== 'completed' && taskToMove.status === 'completed') {
        movedCompletedAt = null;
      }

      // Insert at the new position and reorder
      const updatedTasksInStatus = [
        ...tasksInNewStatus.slice(0, newOrder),
        { ...taskToMove, status: dbStatus, completedAt: movedCompletedAt, updatedAt: moveNow },
        ...tasksInNewStatus.slice(newOrder),
      ].map((t, idx) => ({ ...t, order: idx }));

      // Fix 6: Merge with tasks NOT in the target column (also excluding the
      // moved task, which is already in updatedTasksInStatus).
      const tasksOutsideTarget = otherTasks.filter(
        t => getEffectiveStatus(t) !== newStatus
      );

      const updatedTasks = [...tasksOutsideTarget, ...updatedTasksInStatus];

      // Capture the original state of tasks that will be modified, for
      // targeted rollback (Fix 3).
      const affectedIds = new Set(updatedTasksInStatus.map(t => t.id));
      const originalAffected = tasks.filter(t => affectedIds.has(t.id));

      // Optimistic update
      setTasks(updatedTasks);

      pendingMutationCount.current += 1;
      try {
        // Find all tasks that need updating (changed order or status)
        const tasksToUpdate = updatedTasksInStatus.filter(updatedTask => {
          const original = tasks.find(o => o.id === updatedTask.id);
          return (
            !original ||
            original.order !== updatedTask.order ||
            original.status !== updatedTask.status
          );
        });

        // Fix 2: Batch update all affected tasks, then check for Supabase
        // errors (Promise.all resolves even when .update returns an error).
        const results = await Promise.all(
          tasksToUpdate.map(task => {
            const updateData: DbTaskUpdate = {
              status: task.status as DbTaskStatus,
              order: task.order,
            };
            // Include completed_at for the moved task
            if (task.id === id) {
              updateData.completed_at = movedCompletedAt;
            }
            return supabase
              .from('tasks')
              .update(updateData)
              .eq('id', task.id);
          })
        );

        const firstError = results.find(r => r.error)?.error;
        if (firstError) throw firstError;
      } catch (err) {
        // Fix 3: Targeted rollback -- restore only the tasks that were
        // changed by this mutation, preserving concurrent modifications to
        // other tasks.
        setTasks(prev => {
          const originalById = new Map(originalAffected.map(t => [t.id, t]));
          return prev.map(t => {
            const orig = originalById.get(t.id);
            return orig ? orig : t;
          });
        });
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
      } finally {
        pendingMutationCount.current -= 1;
      }
    },
    [tasks, getEffectiveStatus]
  );

  const reorderTasks = useCallback(
    async (taskId: string, newOrder: number) => {
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

      // Fix 3: Capture original state of affected tasks for targeted rollback.
      const affectedIds = new Set(updatedTasksInStatus.map(t => t.id));
      const originalAffected = tasks.filter(t => affectedIds.has(t.id));

      // Merge back with tasks from other statuses
      const otherTasks = tasks.filter(t => getEffectiveStatus(t) !== status);
      const updatedTasks = [...otherTasks, ...updatedTasksInStatus];

      // Optimistic update
      setTasks(updatedTasks);

      pendingMutationCount.current += 1;
      try {
        // Find all tasks whose order changed
        const tasksToUpdate = updatedTasksInStatus.filter(updatedTask => {
          const original = tasks.find(o => o.id === updatedTask.id);
          return !original || original.order !== updatedTask.order;
        });

        // Fix 2: Check for Supabase errors after Promise.all
        const results = await Promise.all(
          tasksToUpdate.map(t => {
            const updateData: DbTaskUpdate = { order: t.order };
            return supabase
              .from('tasks')
              .update(updateData)
              .eq('id', t.id);
          })
        );

        const firstError = results.find(r => r.error)?.error;
        if (firstError) throw firstError;
      } catch (err) {
        // Fix 3: Targeted rollback using functional updater
        setTasks(prev => {
          const originalById = new Map(originalAffected.map(t => [t.id, t]));
          return prev.map(t => {
            const orig = originalById.get(t.id);
            return orig ? orig : t;
          });
        });
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
      } finally {
        pendingMutationCount.current -= 1;
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
    // midnightTick is included so the context value reference changes at
    // midnight, causing all consumers to re-render and re-evaluate
    // getEffectiveStatus with the new date.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      midnightTick,
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
