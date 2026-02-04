import type { Task } from '../types/task';
import { nanoid } from 'nanoid';
import { addDays, subDays } from 'date-fns';
import { toISODateString } from './date';

/**
 * Helper to get a due date relative to today.
 * Positive days = future, negative days = past.
 */
const getDueDate = (daysFromNow: number): string => {
  const baseDate = new Date();
  const targetDate = daysFromNow >= 0
    ? addDays(baseDate, daysFromNow)
    : subDays(baseDate, Math.abs(daysFromNow));
  return toISODateString(targetDate);
};

export const sampleTasks: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    title: 'Review corn hybrid trials data',
    description: 'Analyze yield data from the 2024 corn hybrid trials across all test locations.',
    status: 'planning',
    category: 'seed-pro',
    priority: 'high',
    assigneeId: 'kyle',
    dueDate: getDueDate(7),
    order: 0,
  },
  {
    title: 'Soil sampling for north fields',
    description: 'Complete soil sampling for fields N1-N12 before spring planting.',
    status: 'in-progress',
    category: 'agronomy',
    priority: 'urgent',
    assigneeId: 'austin',
    dueDate: getDueDate(3),
    order: 0,
  },
  {
    title: 'Q1 sales presentation prep',
    description: 'Prepare slides for the Q1 regional sales meeting.',
    status: 'completed',
    category: 'sales',
    priority: 'medium',
    assigneeId: 'ryan',
    dueDate: getDueDate(-2),
    order: 0,
  },
  {
    title: 'Germination rate testing',
    description: 'Run germination tests on new soybean varieties.',
    status: 'in-progress',
    category: 'testing',
    priority: 'high',
    assigneeId: 'john',
    dueDate: getDueDate(5),
    order: 1,
  },
  {
    title: 'Sample collection deadline',
    description: 'Collect all pending seed samples for lab analysis.',
    status: 'planning',
    category: 'samples',
    priority: 'urgent',
    assigneeId: 'kyle',
    dueDate: getDueDate(-1), // Past due!
    order: 1,
  },
  {
    title: 'Update customer database',
    description: 'Add new contacts from the trade show.',
    status: 'planning',
    category: 'sales',
    priority: 'low',
    assigneeId: null,
    dueDate: getDueDate(14),
    order: 2,
  },
];

export function createSampleTasks(): Task[] {
  const now = new Date().toISOString();
  return sampleTasks.map(task => ({
    ...task,
    id: nanoid(),
    createdAt: now,
    updatedAt: now,
  }));
}
