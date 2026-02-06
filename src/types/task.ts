export type TaskStatus = 'planning' | 'in-progress' | 'completed' | 'past-due';
export type TaskCategory = 'seed-pro' | 'agronomy' | 'sales' | 'testing' | 'samples';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  category: TaskCategory;
  priority: TaskPriority;
  assigneeId: string | null;
  dueDate: string | null; // ISO date string
  completedAt: string | null; // ISO timestamp, set when task moves to completed
  createdAt: string;
  updatedAt: string;
  order: number;
}
