import type { TaskStatus } from '../types/task';

export interface StatusConfig {
  id: TaskStatus;
  label: string;
  primaryColor: string;
  backgroundColor: string;
}

// Confluence Genetics brand-aligned status colors
export const STATUSES: StatusConfig[] = [
  { id: 'planning', label: 'Planning', primaryColor: '#f5b800', backgroundColor: '#fef6de' },
  { id: 'in-progress', label: 'In Progress', primaryColor: '#00a8e8', backgroundColor: '#e6f7fc' },
  { id: 'completed', label: 'Completed', primaryColor: '#4cb944', backgroundColor: '#e8f5e6' },
  { id: 'past-due', label: 'Past Due', primaryColor: '#e05252', backgroundColor: '#fce8e8' },
];

const VALID_STATUS_IDS = new Set<TaskStatus>(STATUSES.map(s => s.id));

export const isValidStatus = (id: string): id is TaskStatus =>
  VALID_STATUS_IDS.has(id as TaskStatus);

const UNKNOWN_STATUS_CONFIG: StatusConfig = {
  id: 'planning' as TaskStatus,
  label: 'Unknown',
  primaryColor: '#8e9bb0',
  backgroundColor: '#f1f4f8',
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
