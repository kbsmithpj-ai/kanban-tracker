import type { TaskCategory } from '../types/task';

export interface CategoryConfig {
  id: TaskCategory;
  label: string;
  primaryColor: string;
  backgroundColor: string;
  borderColor: string;
}

// Confluence Genetics brand-aligned category colors
export const CATEGORIES: CategoryConfig[] = [
  { id: 'seed-pro', label: 'Seed Pro', primaryColor: '#00a8e8', backgroundColor: '#e6f7fc', borderColor: '#0088bc' },
  { id: 'agronomy', label: 'Agronomy', primaryColor: '#4cb944', backgroundColor: '#e8f5e6', borderColor: '#3a9435' },
  { id: 'sales', label: 'Sales', primaryColor: '#f5b800', backgroundColor: '#fef6de', borderColor: '#c49400' },
  { id: 'testing', label: 'Testing', primaryColor: '#7c5cbf', backgroundColor: '#f0ebf8', borderColor: '#5b3d9e' },
  { id: 'samples', label: 'Samples', primaryColor: '#e07040', backgroundColor: '#fce8e0', borderColor: '#b85530' },
];

const VALID_CATEGORY_IDS = new Set<TaskCategory>(CATEGORIES.map(c => c.id));

export const isValidCategory = (id: string): id is TaskCategory =>
  VALID_CATEGORY_IDS.has(id as TaskCategory);

const UNKNOWN_CATEGORY_CONFIG: CategoryConfig = {
  id: 'seed-pro' as TaskCategory,
  label: 'Unknown',
  primaryColor: '#8e9bb0',
  backgroundColor: '#f1f4f8',
  borderColor: '#5d6b82',
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
