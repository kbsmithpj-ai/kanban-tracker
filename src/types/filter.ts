import type { TaskStatus, TaskCategory } from './task';

export interface FilterState {
  assigneeId: string | null;
  categories: TaskCategory[];
  statuses: TaskStatus[];
  searchQuery: string;
}
