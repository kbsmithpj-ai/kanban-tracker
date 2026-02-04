import type { TaskStatus } from '../types/task';

export interface StatusConfig {
  id: TaskStatus;
  label: string;
  primaryColor: string;
  backgroundColor: string;
}

export const STATUSES: StatusConfig[] = [
  { id: 'planning', label: 'Planning', primaryColor: '#FDE047', backgroundColor: '#FEF9C3' },
  { id: 'in-progress', label: 'In Progress', primaryColor: '#38BDF8', backgroundColor: '#E0F2FE' },
  { id: 'completed', label: 'Completed', primaryColor: '#4ADE80', backgroundColor: '#DCFCE7' },
  { id: 'past-due', label: 'Past Due', primaryColor: '#F87171', backgroundColor: '#FEE2E2' },
];

const VALID_STATUS_IDS = new Set<TaskStatus>(STATUSES.map(s => s.id));

export const isValidStatus = (id: string): id is TaskStatus =>
  VALID_STATUS_IDS.has(id as TaskStatus);

const UNKNOWN_STATUS_CONFIG: StatusConfig = {
  id: 'planning' as TaskStatus,
  label: 'Unknown',
  primaryColor: '#9CA3AF',
  backgroundColor: '#F3F4F6',
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
