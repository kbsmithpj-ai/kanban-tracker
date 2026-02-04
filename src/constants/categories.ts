import type { TaskCategory } from '../types/task';

export interface CategoryConfig {
  id: TaskCategory;
  label: string;
  primaryColor: string;
  backgroundColor: string;
  borderColor: string;
}

export const CATEGORIES: CategoryConfig[] = [
  { id: 'seed-pro', label: 'Seed Pro', primaryColor: '#3B82F6', backgroundColor: '#DBEAFE', borderColor: '#1E40AF' },
  { id: 'agronomy', label: 'Agronomy', primaryColor: '#84CC16', backgroundColor: '#ECFCCB', borderColor: '#3F6212' },
  { id: 'sales', label: 'Sales', primaryColor: '#EC4899', backgroundColor: '#FCE7F3', borderColor: '#9D174D' },
  { id: 'testing', label: 'Testing', primaryColor: '#8B5CF6', backgroundColor: '#EDE9FE', borderColor: '#5B21B6' },
  { id: 'samples', label: 'Samples', primaryColor: '#F97316', backgroundColor: '#FED7AA', borderColor: '#9A3412' },
];

const VALID_CATEGORY_IDS = new Set<TaskCategory>(CATEGORIES.map(c => c.id));

export const isValidCategory = (id: string): id is TaskCategory =>
  VALID_CATEGORY_IDS.has(id as TaskCategory);

const UNKNOWN_CATEGORY_CONFIG: CategoryConfig = {
  id: 'seed-pro' as TaskCategory,
  label: 'Unknown',
  primaryColor: '#9CA3AF',
  backgroundColor: '#F3F4F6',
  borderColor: '#6B7280',
};

export const getCategoryConfig = (id: TaskCategory): CategoryConfig => {
  const config = CATEGORIES.find(c => c.id === id);
  if (config) {
    return config;
  }

  if (import.meta.env.DEV) {
    console.warn(`[getCategoryConfig] Unknown category ID: "${id}". This may indicate data corruption.`);
  }

  return UNKNOWN_CATEGORY_CONFIG;
};
