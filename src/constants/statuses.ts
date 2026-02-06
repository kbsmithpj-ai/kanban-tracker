import type { TaskStatus } from '../types/task';

export interface StatusConfig {
  id: TaskStatus;
  label: string;
  primaryColor: string;
  backgroundColor: string;
}

// Confluence Genetics brand-aligned status colors
export const STATUSES: StatusConfig[] = [
  { id: 'planning', label: 'Planning', primaryColor: 'var(--color-planning)', backgroundColor: 'var(--color-planning-bg)' },
  { id: 'in-progress', label: 'In Progress', primaryColor: 'var(--color-in-progress)', backgroundColor: 'var(--color-in-progress-bg)' },
  { id: 'completed', label: 'Completed', primaryColor: 'var(--color-completed)', backgroundColor: 'var(--color-completed-bg)' },
  { id: 'past-due', label: 'Past Due', primaryColor: 'var(--color-past-due)', backgroundColor: 'var(--color-past-due-bg)' },
];

const VALID_STATUS_IDS = new Set<TaskStatus>(STATUSES.map(s => s.id));

export const isValidStatus = (id: string): id is TaskStatus =>
  VALID_STATUS_IDS.has(id as TaskStatus);

const UNKNOWN_STATUS_CONFIG: StatusConfig = {
  id: 'planning' as TaskStatus,
  label: 'Unknown',
  primaryColor: 'var(--color-gray-400)',
  backgroundColor: 'var(--color-gray-100)',
};

export const getStatusConfig = (id: TaskStatus): StatusConfig => {
  const config = STATUSES.find(s => s.id === id);
  if (config) {
    return config;
  }

  if (import.meta.env.DEV) {
    console.warn(`[getStatusConfig] Unknown status ID: "${id}". This may indicate data corruption.`);
  }

  return UNKNOWN_STATUS_CONFIG;
};
